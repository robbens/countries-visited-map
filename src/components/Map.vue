<template>
  <div>
    <div class="sm:flex absolute top-0 right-0 left-0 z-10 m-2 sm:m-4">
      <div class="flex-1 relative sm:mr-4 mb-2 sm:mb-0">
        <CountryAutocomplete
            :countries="countries"
            :selected="selectedCountries"
            @selected="selectedCountries.push($event)"
        />

        <button
            class="absolute text-white opacity-90 hover:opacity-100 bg-blue-900 bottom-1.5 p-2 r-1 right-1.5 rounded top-1.5 leading-none"
            @click="modalOpen = !modalOpen"
            title="Select multiple countries"
        >M</button>
      </div>

      <CityAutocomplete
          :cities="cities"
          :countries="countries"
          :selected="selectedCities"
          @selected="selectedCities.push($event)"
      />

      <div class="flex">
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
              class="input sm:w-32 w-full"
              type="text"
              :value="selectedCountriesAsEmojis"
              onclick="this.select()"
              @click="selectEmojis"
              readonly
          >
        </div>
      </div>
    </div>


    <transition
        enter-active-class="transition-all transition-fastest ease-out-quad"
        leave-active-class="transition-all transition-fastest ease-in-quad"
        enter-class="opacity-0 scale-70"
        enter-to-class="opacity-100 scale-100"
        leave-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-70"
    >
      <div
          v-if="modalOpen"
          class="absolute right-0 scale-100 grid sm:grid-cols-3 xl:grid-cols-6 origin-top-right z-50 bg-white px-3 sm:px-5 text-left overflow-auto"
      >
        <span
            class="z-30 bg-blue-900 bottom-0 cursor-pointer fixed hover:translate-y-1.5 mb-4 px-7 py-3 rounded-2xl shadow-2xl text-lg text-white"
            style="left: 50%; transform: translateX(-50%)"
            @click="modalOpen = false"
        >
          <span class="font-bold">CLOSE</span> <span class="hidden lg:inline">(ESC)</span>
        </span>

        <div
            v-for="(countries, region) in filteredCountriesByRegion"
            :key="region"
        >
          <h2 class="font-medium text-2xl p-2 pt-6 sticky top-0 bg-white z-10">{{ region }}</h2>
          <div class="">
            <div
                v-for="country in countries"
                class="cursor-pointer relative text-sm sm:text-lg p-2"
                :key="country.cca3"
                :class="{'font-medium': selectedCountries.some(c => country.cca3 === c.cca3)}"
                @click="toggleCountry(country)"
            >
              <span v-if="selectedCountries.some(c => country.cca3 === c.cca3)">
                ✅
              </span>
              {{ country.name.common }}
            </div>
          </div>
        </div>
      </div>
    </transition>


    <Mapbox style="height: 100vh;" :zoom="2" :center="mapCenter">
      <MglGeojsonLayer
          v-for="country in countriesWithGeoData"
          :key="country.cca3"
          :sourceId="country.cca3"
          :source="countryGeoData[country.cca3]['source']"
          :layerId="country.cca3"
          :layer="countryGeoData[country.cca3]['layer']"
      />
      <MglMarker v-for="city in selectedCities" :coordinates="[city.lng, city.lat]" :key="city.lng.toString() + city.lat.toString()">
        <MglPopup anchor="top" :close-on-click="true">
          {{ city.name }}
        </MglPopup>
      </MglMarker>
    </Mapbox>
  </div>
</template>

<script>
import {MglGeojsonLayer, MglMarker, MglPopup} from "vue-mapbox"

import countries from '../data/countries.json'
import cities from '../data/cities.json'
import emojis from '../data/emojis.js'

import Mapbox from "@/components/Mapbox.vue"
import CityAutocomplete from "@/components/CityAutocomplete.vue"
import CountryAutocomplete from "@/components/CountryAutocomplete.vue"

export default {
  name: 'Map',
  components: {CountryAutocomplete, CityAutocomplete, Mapbox, MglGeojsonLayer, MglMarker, MglPopup},
  data() {
    return {
      // Raw data
      cities: cities,
      countries: countries,

      // Selected
      selectedCities: [],
      selectedCountries: [],

      // Geo data
      countryGeoData: {},

      // Mapbox
      map: null,
      mapCenter: [-3.749220, 40.463669],

      // Misc
      modalOpen: false,
    }
  },

  created() {
    window.addEventListener('keyup', e => {
      if (this.modalOpen && e.key === 'Escape') {
        this.modalOpen = false
      }
    })
  },

  watch: {
    selectedCountries(val) {
      val.forEach(this.fetchGeoJson)
    },
  },

  computed: {
    countriesWithGeoData() {
      return this.selectedCountries.filter(c => {
        return c.cca3 in this.countryGeoData
      })
    },
    selectedCountriesAsEmojis() {
      return this.selectedCountries.map(c => {
        return emojis[c.cca2]
      }).join('')
    },
    filteredCountriesByRegion() {
      return this.groupBy(this.countries, 'region')
    },
  },

  methods: {
    toggleCountry(country) {
      if (this.selectedCountries.includes(country)) {
        const index = this.selectedCountries.findIndex(c => c.cca3 === country.cca3)
        this.selectedCountries.splice(index, 1)
      } else {
        this.selectedCountries.push(country)
      }
    },
    selectEmojis() {
        window.gtag('event', 'clicked', {
          'event_category': 'emojis',
        });
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
    fetchGeoJson(country) {
      if (!country) return

      const countryCode = country.cca3

      if (countryCode in this.countryGeoData) return

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
          })
    }
  },
}
</script>

<style>
.mapboxgl-popup-close-button, .mapboxgl-popup-close-button:focus {
  outline: 0;
}

.autocomplete-input:focus, .autocomplete-input[aria-expanded=true] {
  border-color: rgba(0, 0, 0, .12);
  background-color: #fff;
  outline: none;
  box-shadow: 0 2px 2px rgba(0, 0, 0, .16)
}

[data-position=below] .autocomplete-input[aria-expanded=true] {
  border-bottom-color: transparent;
  border-radius: 8px 8px 0 0
}

[data-position=above] .autocomplete-input[aria-expanded=true] {
  border-top-color: transparent;
  border-radius: 0 0 8px 8px;
  z-index: 2
}

.autocomplete[data-loading=true]:after {
  content: "";
  border: 3px solid rgba(0, 0, 0, .12);
  border-right-color: rgba(0, 0, 0, .48);
  border-radius: 100%;
  width: 20px;
  height: 20px;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  animation: rotate 1s linear infinite
}

.autocomplete-result-list {
  margin: 0;
  border: 1px solid rgba(0, 0, 0, .12);
  padding: 0;
  box-sizing: border-box;
  max-height: 296px;
  overflow-y: auto;
  background: #fff;
  list-style: none;
  box-shadow: 0 2px 2px rgba(0, 0, 0, .16)
}

[data-position=below] .autocomplete-result-list {
  margin-top: -1px;
  border-top-color: transparent;
  border-radius: 0 0 8px 8px;
  padding-bottom: 8px
}

[data-position=above] .autocomplete-result-list {
  margin-bottom: -1px;
  border-bottom-color: transparent;
  border-radius: 8px 8px 0 0;
  padding-top: 8px
}

.autocomplete-result {
  cursor: default;
  padding: 12px;
}

.autocomplete-result:hover, .autocomplete-result[aria-selected=true] {
  background-color: rgba(51, 217, 178, 0.2);
}

@keyframes rotate {
  0% {
    transform: translateY(-50%) rotate(0deg)
  }
  to {
    transform: translateY(-50%) rotate(359deg)
  }
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

.input, .autocomplete-input {
  border: 1px solid #ccc;
  background-color: #fff;
  background-image: none;
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
