<template>
  <MglMap
      :accessToken="accessToken"
      :mapStyle="mapStyle"
      style="height: 500px;"
      v-bind="$attrs"
  >
    <slot />
  </MglMap>
</template>

<script>
import Mapbox from "mapbox-gl";
import { MglMap } from "vue-mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default {
  components: {
    MglMap
  },
  data() {
    return {
      accessToken: 'pk.eyJ1Ijoicm9iaW5uaWxzc29uIiwiYSI6ImNrcGZjaW1qazB1bmUybm84eXdwZzdhcDEifQ.9sSAqbg1PbcKqtjiWWlN5Q',
      mapStyle: 'mapbox://styles/mapbox/streets-v11',
    };
  },

  created() {
    // We need to set mapbox-gl library here in order to use it in template
    this.mapbox = Mapbox;
  }
};
</script>
