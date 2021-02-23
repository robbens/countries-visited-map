<template>
  <vue-autosuggest
      class="sm:mr-4 mb-2 sm:mb-0"
      v-model="query"
      :suggestions="filteredCities"
      :get-suggestion-value="(city) => city.country"
      :input-props="{class: 'input', placeholder: 'Enter a city'}"
      @selected="addCity($event.item.item)"
  >
    <div
        slot-scope="{suggestion}"
        style="display: flex; align-items: center;"
    >
      <img
          :src="`/flags/${suggestion.item.item.country.toLowerCase()}.png`"
          :key="suggestion.item.item.cca2"
          class="flex w-10 mr-4"
      >

      <div class="text-gray-800 text-left">
        {{ suggestion.item.item.name }}, {{ getCountry(suggestion.item.item).name.common }}
      </div>
    </div>
  </vue-autosuggest>
</template>

<script>
import Fuse from "fuse.js"
import {debounce} from "lodash"
import {VueAutosuggest} from 'vue-autosuggest'

export default {
  name: "CityAutocomplete",

  components: {VueAutosuggest},

  props: {
    cities: {
      type: Array,
      default: () => []
    },
    countries: {
      type: Array,
      default: () => []
    },
    selected: {
      type: Array,
      default: () => []
    },
  },

  data() {
    return {
      filteredCities: [],
      query: '',
    }
  },

  watch: {
    selected(val) {
      window.localStorage.setItem('selectedCities', JSON.stringify(val))
    },

    query: debounce(function(val) {
      const options = {
        includeScore: true,
        keys: ['name'],
      }

      const fuse = new Fuse(this.cities, options, this.citiesIndex)

      const data = fuse.search(val, {limit: 25})

      this.filteredCities = [{data}]
    }, 200),
  },

  created() {
    // Add cities saved in local storage
    const selectedCities = JSON.parse(window.localStorage.getItem('selectedCities')) || []
    this.initCities(selectedCities)

    // Build Fuse.js index
    this.citiesIndex = Fuse.createIndex(['name'], this.cities)
  },

  methods: {
    initCities(cities) {
      cities.forEach(city => this.$emit('selected', city))
    },
    addCity(city) {
      this.query = ''

      if (!this.selected.some(c => c.geonameid === city.geonameid)) {
        this.$emit('selected', city)
      }
    },
    getCountry(city) {
      return this.countries.find(c => c.cca2 === city.country)
    },
  },

}
</script>

<style scoped>

</style>
