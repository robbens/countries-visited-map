<template>
  <form
      autocomplete="off"
      @submit="$event.preventDefault()"
  >
    <autocomplete
        :search="search"
        :auto-select="true"
        :get-result-value="getResultValue"
        :debounce-time="200"
        placeholder="Enter a country"
        @submit="addCountry($event.item, true)"
    >
      <template #result="{ result, props }">
        <li
            v-bind="props"
            style="display: flex; align-items: center;"
        >
          <img
              :src="`/flags/${result.item.cca2.toLowerCase()}.png`"
              :key="result.item.cca2"
              class="flex w-10 mr-4"
          >
          <div class="flex text-gray-800 text-left">{{ result.item.name.common }}</div>
        </li>
      </template>
    </autocomplete>
  </form>
</template>

<script>
import Fuse from "fuse.js"

export default {
  name: "CountryAutocomplete",

  props: {
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
      filteredCountries: [],
      query: '',
      countriesIndex: null
    }
  },

  watch: {
    selected(val) {
      window.localStorage.setItem('selectedCountries', JSON.stringify(val))
    },
  },

  created() {
    // Add countries saved in local storage
    const selectedCountries = JSON.parse(window.localStorage.getItem('selectedCountries')) || []
    this.initCountries(selectedCountries)

    // Build Fuse.js index
    this.countriesIndex = Fuse.createIndex(['name.common'], this.countries)
  },

  methods: {
    getResultValue() {
      return ''
    },
    search(input) {
      if (input.length < 1) { return [] }

      const options = {
        includeScore: true,
        keys: ['name.common', 'altSpellings', 'region'],
      }

      const fuse = new Fuse(this.countries, options, this.countriesIndex)

      return fuse.search(input, {limit: 25})
    },
    initCountries(countries) {
      countries.forEach(this.addCountry)
    },
    addCountry(country, manual = false) {
      if (manual) {
        window.gtag('event', 'added', {
          'event_category': 'countries',
          'event_label': country.cca3,
          });
      }

      this.query = ''

      if (!this.selected.some(c => c.cca3 === country.cca3)) {
        this.$emit('selected', country)
      }
    },
  },

}
</script>

<style scoped>

</style>
