<template>
  <div>
    <div class="sm:flex absolute top-0 right-0 left-0 z-10 m-2 sm:m-4">
      <vue-autosuggest
          class="sm:mr-4 mb-2 sm:mb-0"
          v-model="countryQuery"
          :suggestions="filteredCountries"
          :get-suggestion-value="getSuggestionValue"
          :input-props="{id: 'autosuggest__input-country', class: 'input', placeholder: 'Enter a country'}"
          @selected="addCountry($event.item.cca3)"
      >
        <div
            slot-scope="{suggestion}"
            style="display: flex; align-items: center;"
        >
          <img
              :src="`/flags/${suggestion.item.cca2.toLowerCase()}.png`"
              :key="suggestion.item.cca2"
              class="flex w-10 mr-4"
          >
          <div class="flex text-gray-800">{{ suggestion.item.name.common }}</div>
        </div>
      </vue-autosuggest>

      <vue-autosuggest
          class="sm:mr-4 mb-2 sm:mb-0"
          v-model="cityQuery"
          :suggestions="filteredCities"
          :get-suggestion-value="(city) => city.country"
          :input-props="{id: 'autosuggest__input', class: 'input', placeholder: 'Enter a city'}"
          @selected="addCity($event.item)"
      >
        <div slot-scope="{suggestion}">
          <div class="flex text-gray-800">
            {{ suggestion.item.name }}, {{ getCityCountry(suggestion.item) }}
          </div>
        </div>
      </vue-autosuggest>

      <div class="flex">
        <button
            class="bg-blue-900 mr-2 lg:mr-4 rounded-md text-white text-xs font-medium whitespace-nowrap px-4"
            @click="modalOpen = !modalOpen"
        >Select multiple
        </button>

        <div
            class="mr-2 lg:mr-4 rounded-full text-white flex items-center content-center text-xs font-medium p-3 lg:px-4 whitespace-nowrap bg-indigo-700"
            title="Number of visited countries"
        >
          <strong>{{ selectedCountries.length }}</strong>
          <em>({{ roundNumber((selectedCountries.length / 195) * 100) }}%)</em>
        </div>

        <div
            class="lg:mr-4 flex flex-1 items-center text-black cursor-pointer"
        >
          <input
              class="input sm:w-24 w-full"
              type="text"
              :value="selectedCountriesAsEmojis"
              onclick="this.select()"
              readonly
          >
        </div>
      </div>
    </div>


    <div
        class="sm:grid-cols-3 fixed top-0 left-0 right-0 bottom-0 z-50 bg-white px-3 sm:px-5 text-left overflow-auto"
        :class="{'grid': modalOpen, 'hidden': !modalOpen}"
    >
      <span
          class="cursor-pointer fixed mr-2 mt-5 px-4 right-0 text-4xl top-0 z-10"
          @click="modalOpen = false"
      >&times;</span>

      <div
          v-for="(countries, region) in filteredCountriesByRegion"
          :key="region"
      >
        <h2 class="font-medium text-2xl p-2 pt-6 sticky top-0 bg-white">{{ region }}</h2>
        <div class="grid grid-cols-2">
          <div
              v-for="country in countries"
              class="cursor-pointer relative text-sm sm:text-lg p-2"
              :key="country.cca3"
              :class="{'font-medium': selectedCountries.includes(country.cca3)}"
              @click="addCountry(country.cca3)"
          >
            <span v-if="selectedCountries.includes(country.cca3)">
              ✅
            </span>
            {{ country.name.common }}
          </div>
        </div>
      </div>
    </div>

    <Mapbox style="height: 100vh;" :zoom="2" :center="mapCenter">
      <MglGeojsonLayer
          v-for="country in filteredSelectedCountries"
          :key="country"
          :sourceId="country"
          :source="countryGeoData[country]['source']"
          :layerId="country"
          :layer="countryGeoData[country]['layer']"
      />
      <MglMarker v-for="city in selectedCities" :coordinates="[city.lng, city.lat]" :key="city.lng.toString() + city.lat.toString()"></MglMarker>
    </Mapbox>
  </div>
</template>

<script>
import countries from './countries.json'
import cities from './cities.json'
import emojis from './emojis.js'
import {VueAutosuggest} from 'vue-autosuggest';
import Mapbox from "@/components/Mapbox";
import {MglGeojsonLayer, MglMarker} from "vue-mapbox";
import {debounce} from "lodash";

export default {
  name: 'Map',
  components: {Mapbox, MglGeojsonLayer, VueAutosuggest, MglMarker},
  data() {
    return {
      countryQuery: '',
      map: null,
      mapCenter: [-3.749220, 40.463669],
      countries: countries,
      selectedCountries: [],
      countryGeoData: {},
      cities: cities,
      selectedCities: [],
      cityQuery: '',
      debouncedCityQuery: '',
      modalOpen: false,
    }
  },

  created() {
    const selectedCountries = JSON.parse(window.localStorage.getItem('selectedCountries')) || []

    this.initCountries(selectedCountries)

    window.addEventListener('keyup', e => {
      if (this.modalOpen && e.key === 'Escape') {
        this.modalOpen = false
      }
    })
  },

  watch: {
    selectedCountries(val) {
      window.localStorage.setItem('selectedCountries', JSON.stringify(val))
    },

    cityQuery: debounce(function(val) {
      this.debouncedCityQuery = val
    }, 500)
  },

  computed: {
    filteredSelectedCountries() {
      return this.selectedCountries.filter(c => {
        return !!this.countryGeoData[c]
      })
    },
    selectedCountriesAsEmojis() {
      return this.selectedCountries.map(c => {
        const country = this.countries.find(c2 => c2.cca3 === c)

        return emojis[country.cca2]
      }).join('')
    },
    filteredCountriesByRegion() {
      return this.groupBy(this.countries, 'region')
    },
    filteredCities() {
      if (!this.debouncedCityQuery) return [{data: []}]

      return [
        {
          data: this.cities.filter(city => {
            return city.name.toLowerCase().includes(this.debouncedCityQuery.toLowerCase())
          })
        }
      ];
    },
    filteredCountries() {
      if (!this.countryQuery || this.countryQuery.length < 2) return []

      return [
        {
          data: this.countries.filter(country => {
            return country.name.common.toLowerCase().startsWith(this.countryQuery.toLowerCase())
          })
        }
      ];
    }
  },

  methods: {
    getCityCountry(city) {
      const country = this.countries.find(c => c.cca2 === city.country)

      if (!country) return ''

      return country.name.common
    },
    addCity(city) {
      if (this.selectedCities.indexOf(city) === -1) {
        this.selectedCities.push(city)
      }
    },
    initCountries(countries) {
      countries.forEach(this.addCountry)
    },
    groupBy(list, props) {
      return list.reduce((a, b) => {
        (a[b[props]] = a[b[props]] || []).push(b);
        return a;
      }, {});
    },
    roundNumber(num) {
      return +(Math.round(num + 'e+1') + 'e-1');
    },
    getSuggestionValue(suggestion) {
      return suggestion.item.name.common;
    },
    async addCountry(countryCode) {
      if (this.selectedCountries.includes(countryCode)) {
        this.selectedCountries = this.selectedCountries.filter(c => c !== countryCode)
        return;
      }

      this.selectedCountries.push(countryCode)

      this.countryQuery = ''

      fetch('/countries/' + countryCode.toLowerCase() + '.geo.json')
          .then(response => response.json())
          .then(data => {
            this.$set(this.countryGeoData, countryCode, {
              source: {
                'type': 'geojson',
                'data': {
                  'type': 'Feature',
                  'geometry': data.features[0].geometry
                }
              },
              layer: {
                'id': countryCode,
                'type': 'fill',
                'source': countryCode,
                'layout': {},
                'paint': {
                  'fill-color': '#099',
                  'fill-opacity': 0.8
                }
              }
            })
          }).then(() => {
        // this.selectedCountries.push(countryCode)
      })
    },
  },
}
</script>

<style>
.demo {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.autosuggest__results-container ul {
  width: 100%;
  color: rgba(30, 39, 46, 1.0);
  list-style: none;
  margin: 0;
  padding: 0.5rem 0 .5rem 0;
}

.autosuggest__results-container li {
  margin: 0 0 0 0;
  border-radius: 5px;
  padding: 0.75rem 0 0.75rem 0.75rem;
  display: flex;
  align-items: center;
}

.autosuggest__results-container li:hover {
  cursor: pointer;
}

.autosuggest-container {
  display: flex;
  justify-content: center;
  width: 280px;
}

#autosuggest {
  width: 100%;
  display: block;
}

.autosuggest__results-item--highlighted {
  background-color: rgba(51, 217, 178, 0.2);
}

#autosuggest {
  position: relative;
}

.autosuggest__results {
  overflow: scroll;
  max-height: 80vh;
}

.autosuggest__results-container {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: white;
  width: 100%;
}

#modal-select-countries {
  display: none;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  background-color: #fff;
  text-align: left;
  padding: 50px;
}

#modal-select-countries.open {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  overflow: auto;
}

.modal-close {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 40px;
  margin: 0 14px;
  cursor: pointer;
}

.input {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px 12px;
  width: 100%;
  outline: 0;
}

.map-input {
  display: flex;
  position: absolute;
  top: 0;
  z-index: 100;
  right: 0;
  left: 0;
  margin: 20px;
}

.select-multiple-button {
  background: #343254;
  font-weight: 600;
  border: 0;
  color: #fff;
  border-radius: 6px;
  padding: 6px;
  font-size: 12px;
  width: 100%;
  flex: 0 0 120px;
  margin-left: 20px;
  cursor: pointer;
  outline: 0;
}

.select-multiple-button:hover {
  background: #3c3a5f;
}

.select-multiple-button:focus,
.select-multiple-button:active {
  background: #46446d;
}

.percent-visited {
  background: #448ede;
  color: #fff;
  border-radius: 5000px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  padding: 9px;
  margin-left: 20px;
  white-space: nowrap;
}
</style>
