<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <meta name="description" content="Stocky POS — Application de Point de Vente et gestion d'inventaire. Développé par OceanTechnologie." />
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#663399" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="application-name" content="Stocky POS" />
    
    <!-- Apple PWA Meta Tags (iOS) -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Stocky POS" />
    <link rel="apple-touch-icon" href="/images/icons/icon-192x192.png" />
    
    <!-- Favicon et icônes -->
    <link rel="icon" href="/images/favicon.ico" />
    <link rel="icon" type="image/png" sizes="192x192" href="/images/icons/icon-192x192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/images/icons/icon-512x512.png" />
    
    <!-- Manifest PWA -->
    <link rel="manifest" href="/manifest.json" />
    
    <link rel="stylesheet" href="/css/master.css">

    <!-- Injection de la clé publique VAPID pour les Push Notifications PWA -->
    <script>
      window.vapidPublicKey = "{{ config('webpush.vapid.public_key') }}";
    </script>

    <title>Stocky | Ultimate Inventory With POS</title>
  </head>

  <body class="text-left">
    <noscript>
      <strong>
        We're sorry but Stocky doesn't work properly without JavaScript
        enabled. Please enable it to continue.</strong
      >
    </noscript>

    <!-- built files will be auto injected -->
    <div class="loading_wrap" id="loading_wrap">
      <div class="loader_logo">
      <img src="/images/logo.png" class="" alt="logo" />

      </div>

      <div class="loading"></div>
    </div>
    <div id="app">
      <script src="/assets_setup/js/qrcode.js"></script>

    </div>

    <script>
      window.config = {
        "ModulesEnabled" : @json($ModulesEnabled),
        "ModulesInstalled" : @json($ModulesInstalled),
      };
    </script>

    <script src="/js/main.min.js?v=4.0.8"></script>

  </body>
</html>
