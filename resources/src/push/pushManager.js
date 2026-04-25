/**
 * pushManager.js — Gestionnaire des notifications push
 * Développé par OceanTechnologie
 * 
 * Fonctionnalités :
 * - Demande la permission pour les notifications push
 * - Crée un abonnement push via l'API du navigateur
 * - Envoie l'abonnement au backend Laravel
 * - Gère le désabonnement
 */

// Clé publique VAPID (sera remplacée par la vraie clé après php artisan webpush:vapid)
// IMPORTANT : Remplacer cette valeur par votre clé VAPID publique
const VAPID_PUBLIC_KEY = window.vapidPublicKey || '';

/**
 * Convertit une chaîne base64 en Uint8Array
 * Nécessaire pour l'API Push du navigateur
 * @param {string} base64String - Clé VAPID en base64
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Vérifie si les notifications push sont supportées par le navigateur
 * @returns {boolean}
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Vérifie si l'utilisateur a déjà donné sa permission pour les notifications
 * @returns {string} - 'granted', 'denied', ou 'default'
 */
export function getNotificationPermission() {
  return Notification.permission;
}

/**
 * Demande la permission pour les notifications push
 * @returns {Promise<string>} - 'granted', 'denied', ou 'default'
 */
export async function demanderPermissionPush() {
  if (!isPushSupported()) {
    console.warn('[Push] Les notifications push ne sont pas supportées par ce navigateur');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    return permission;
  } catch (error) {
    console.error('[Push] Erreur lors de la demande de permission:', error);
    return 'error';
  }
}

/**
 * Crée un abonnement push et l'envoie au backend
 * @returns {Promise<Object|null>} - Objet d'abonnement ou null si échec
 */
export async function souscrireAuxNotifications() {
  if (!isPushSupported()) {
    console.warn('[Push] Push non supporté');
    return null;
  }

  // Vérifier la permission
  if (Notification.permission !== 'granted') {
    const permission = await demanderPermissionPush();
    if (permission !== 'granted') {
      console.log('[Push] Permission refusée par l\'utilisateur');
      return null;
    }
  }

  try {
    // Récupérer le Service Worker enregistré
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker prêt, création de l\'abonnement...');

    // Vérifier s'il y a déjà un abonnement
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Abonnement existant trouvé');
      // Envoyer l'abonnement existant au backend (au cas où il ne le connaît pas)
      await envoyerAbonnementAuBackend(subscription);
      return subscription;
    }

    // Créer un nouvel abonnement
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] Clé VAPID publique non configurée. Configurez-la dans le backend.');
      return null;
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log('[Push] Nouvel abonnement créé:', subscription.endpoint);
    
    // Envoyer l'abonnement au backend
    await envoyerAbonnementAuBackend(subscription);
    
    return subscription;
  } catch (error) {
    console.error('[Push] Erreur lors de la souscription:', error);
    return null;
  }
}

/**
 * Envoie l'abonnement push au backend Laravel
 * @param {PushSubscription} subscription - Objet d'abonnement du navigateur
 */
async function envoyerAbonnementAuBackend(subscription) {
  try {
    const key = subscription.getKey('p256dh');
    const token = subscription.getKey('auth');

    const response = await window.axios.post('push/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : '',
        auth: token ? btoa(String.fromCharCode.apply(null, new Uint8Array(token))) : '',
      },
    });

    console.log('[Push] Abonnement envoyé au backend avec succès');
    return response.data;
  } catch (error) {
    console.error('[Push] Erreur lors de l\'envoi de l\'abonnement au backend:', error);
    throw error;
  }
}

/**
 * Se désabonne des notifications push
 * @returns {Promise<boolean>} - true si le désabonnement a réussi
 */
export async function seDesabonner() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Informer le backend du désabonnement
      await window.axios.delete('push/unsubscribe', {
        data: { endpoint: subscription.endpoint },
      });

      // Désabonner côté navigateur
      await subscription.unsubscribe();
      console.log('[Push] Désabonnement réussi');
      return true;
    }

    console.log('[Push] Aucun abonnement à supprimer');
    return false;
  } catch (error) {
    console.error('[Push] Erreur lors du désabonnement:', error);
    return false;
  }
}

/**
 * Initialise les notifications push au premier lancement
 * Demande la permission si elle n'a pas encore été donnée
 */
export async function initialiserPush() {
  if (!isPushSupported()) {
    console.log('[Push] Notifications push non supportées');
    return;
  }

  console.log('[Push] Initialisation des notifications push — OceanTechnologie');

  // Si la permission n'a pas encore été demandée, la demander
  if (Notification.permission === 'default') {
    // Attendre un peu pour ne pas bombarder l'utilisateur au chargement
    setTimeout(async () => {
      await souscrireAuxNotifications();
    }, 10000); // Attendre 10 secondes
  } else if (Notification.permission === 'granted') {
    // Si déjà autorisé, s'assurer que l'abonnement est enregistré
    await souscrireAuxNotifications();
  }
}
