<template>
  <form
      autocomplete="off"
      @submit="$event.preventDefault()"
      class="sm:mr-4 mb-2 sm:mb-0 flex-1"
  >
    <autocomplete
        :search="search"
        :auto-select="true"
        :get-result-value="getResultValue"
        :debounce-time="200"
        placeholder="Enter a city"
        @submit="addCity($event.item, true)"
    >
      <template #result="{ result, props }">
        <li
            v-bind="props"
            style="display: flex; align-items: center;"
        >
          <img
              :src="`/flags/${result.item.country.toLowerCase()}.png`"
              :key="result.item.cca2"
              class="flex w-10 mr-4"
          >

          <div class="text-gray-800 text-left">
            {{ result.item.name }}, {{ getCountry(result.item).name.common }}
          </div>
        </li>
      </template>
    </autocomplete>
  </form>
</template>

<script>
import Fuse from "fuse.js"

export default {
  name: "CityAutocomplete",

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
  },

  created() {
    // Add cities saved in local storage
    const selectedCities = JSON.parse(window.localStorage.getItem('selectedCities')) || []
    this.initCities(selectedCities)

    // Build Fuse.js index
    this.citiesIndex = Fuse.createIndex(['name'], this.cities)
  },

  methods: {
    getResultValue() {
      return ''
    },
    search(input) {
      if (input.length < 1) { return [] }

      const options = {
        includeScore: true,
        keys: ['name'],
        threshold: 0.25,
      }

      const fuse = new Fuse(this.cities, options, this.citiesIndex)

      return fuse.search(input, {limit: 25})
    },
    initCities(cities) {
      cities.forEach(this.addCity)
    },
    addCity(city, manual = false) {
      this.query = ''

      if (manual) {
        window.gtag('event', 'added', {
          'event_category': 'cities',
          'event_label': city.geonameid,
        });
      }

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
