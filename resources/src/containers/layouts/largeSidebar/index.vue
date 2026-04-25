<template>
  <div class="app-admin-wrap layout-sidebar-large clearfix">
    <!-- Bannière de statut réseau — OceanTechnologie -->
    <offline-banner></offline-banner>
    
    <top-nav />

    <sidebar />

    <main>
      <div
        :class="{ 'sidenav-open': getSideBarToggleProperties.isSideNavOpen }"
        class="main-content-wrap d-flex flex-column flex-grow-1"
      >
        <transition name="page" mode="out-in">
          <router-view />
        </transition>

        <div class="flex-grow-1"></div>
        <appFooter />
      </div>
    </main>
  </div>
</template>

<script>
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import appFooter from "../common/footer";
import { mapGetters, mapActions } from "vuex";
// Bannière offline/online — OceanTechnologie
import OfflineBanner from "../../../components/common/OfflineBanner.vue";

export default {
  components: {
    Sidebar,
    TopNav,
    appFooter,
    OfflineBanner,
  },
  data() {
    return {};
  },
  computed: {
    ...mapGetters(["getSideBarToggleProperties"]),
  },
  methods: {},
};
</script>
<style>
</style>