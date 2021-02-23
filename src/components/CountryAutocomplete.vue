<template>
  <vue-autosuggest
      class="sm:mr-4 mb-2 sm:mb-0"
      v-model="query"
      :suggestions="filteredCountries"
      :get-suggestion-value="(country) => country.item.item.name.common"
      :input-props="{class: 'input', placeholder: 'Enter a country'}"
      @selected="addCountry($event.item.item)"
  >
    <div
        slot-scope="{suggestion}"
        style="display: flex; align-items: center;"
    >
      <img
          :src="`/flags/${suggestion.item.item.cca2.toLowerCase()}.png`"
          :key="suggestion.item.item.cca2"
          class="flex w-10 mr-4"
      >
      <div class="flex text-gray-800 text-left">{{ suggestion.item.item.name.common }}</div>
    </div>
  </vue-autosuggest>
</template>

<script>
import Fuse from "fuse.js"
import {debounce} from "lodash"
import {VueAutosuggest} from 'vue-autosuggest'

export default {
  name: "CountryAutocomplete",

  components: {VueAutosuggest},

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

    query: debounce(function(val) {
      const options = {
        includeScore: true,
        keys: ['name.common', 'altSpellings', 'region'],
      }

      const fuse = new Fuse(this.countries, options, this.countriesIndex)

      const data = fuse.search(val, {limit: 25})

      this.filteredCountries = [{data}]
    }, 200),
  },

  created() {
    // Add countries saved in local storage
    const selectedCountries = JSON.parse(window.localStorage.getItem('selectedCountries')) || []
    this.initCountries(selectedCountries)

    // Build Fuse.js index
    this.countriesIndex = Fuse.createIndex(['name.common'], this.countries)
  },

  methods: {
    initCountries(countries) {
      countries.forEach(this.addCountry)
    },
    addCountry(country) {
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
