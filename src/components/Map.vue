<template>
  <div>
    <div class="sm:flex absolute top-0 right-0 left-0 z-10 m-2 sm:m-4">

      <CountryAutocomplete
          :countries="countries"
          :selected="selectedCountries"
          @selected="selectedCountries.push($event)"
      />

      <CityAutocomplete
          :cities="cities"
          :countries="countries"
          :selected="selectedCities"
          @selected="selectedCities.push($event)"
      />

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
            class="mr-2 lg:mr-4 flex flex-1 items-center text-black cursor-pointer"
        >
          <input
              class="input sm:w-24 w-full"
              type="text"
              :value="selectedCountriesAsEmojis"
              onclick="this.select()"
              readonly
          >
        </div>

        <button
            class="bg-green-500 rounded-md text-white text-xs font-medium whitespace-nowrap px-4"
            @click="register"
        >Save
        </button>

        <button
            class="bg-green-500 rounded-md text-white text-xs font-medium whitespace-nowrap px-4"
            @click="login"
        >Restore
        </button>
      </div>
    </div>


    <div
        class="sm:grid-cols-3 xl:grid-cols-6 fixed top-0 left-0 right-0 bottom-0 z-50 bg-white px-3 sm:px-5 text-left overflow-auto"
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
        <h2 class="font-medium text-2xl p-2 pt-6 sticky top-0 bg-white z-10">{{ region }}</h2>
        <div class="">
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
          v-for="country in countriesWithGeoData"
          :key="country"
          :sourceId="country"
          :source="countryGeoData[country]['source']"
          :layerId="country"
          :layer="countryGeoData[country]['layer']"
      />
      <MglMarker v-for="city in computedSelectedCities" :coordinates="[city.lng, city.lat]"
                 :key="city.lng.toString() + city.lat.toString()">
        <MglPopup anchor="top" :close-on-click="true">
          {{ city.name }}
        </MglPopup>
      </MglMarker>
    </Mapbox>
  </div>
</template>

<script>
// Mapbox
import {MglGeojsonLayer, MglMarker, MglPopup} from "vue-mapbox"

// Data
import countries from '../data/countries.json'
import cities from '../data/cities.json'
import emojis from '../data/emojis.js'

// Components
import Mapbox from "@/components/Mapbox.vue"
import CityAutocomplete from "@/components/CityAutocomplete.vue"
import CountryAutocomplete from "@/components/CountryAutocomplete.vue"

import Firebase from '../firebase.js';

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

      user: {
        loggedIn: false,
        data: {}
      }
    }
  },

  mounted() {
    Firebase.auth().onAuthStateChanged(user => {
      if (user) {
        this.user.loggedIn = true;
        this.user.data = user;
      } else {
        this.user.loggedIn = false;
        this.user.data = {};
      }
    })
  },

  created() {
    window.addEventListener('keyup', e => {
      if (this.modalOpen && e.key === 'Escape') {
        this.modalOpen = false
      }
    })

    // Add countries saved in storage
    this.getFromDB().then(({selectedCountries, selectedCities}) => {
      selectedCountries.forEach(country => {
        this.selectedCountries.push(country)
        // if (!this.selectedCountries.some(c => c === country)) {
        //   if (!country) return
        //   this.selectedCountries.push(country)
        // }
      })

      selectedCities.forEach(city => {
        this.selectedCities.push(city)
        // if (!this.selectedCities.some(c => c === city)) {
        //   if (!city) return
        //   this.selectedCities.push(city)
        // }
      })
    })
  },

  watch: {
    selectedCountries(val) {
      val.forEach(this.fetchGeoJson)
      this.saveToDB()
    },
    selectedCities() {
      this.saveToDB()
    }
  },

  computed: {
    isLoggedIn() {
      return this.user.loggedIn
    },
    computedSelectedCities() {
      return this.selectedCities.map(c => {
        return this.cities.find(city => city.geonameid === c)
      })
    },
    countriesWithGeoData() {
      return this.selectedCountries.filter(c => c in this.countryGeoData)
    },
    selectedCountriesAsEmojis() {
      return this.selectedCountries.map(c => emojis[c]).join('')
    },
    filteredCountriesByRegion() {
      return this.groupBy(this.countries, 'region')
    },
  },

  methods: {
    login() {
      Firebase.login().then(async () => {
        const data = await this.getFromDB()

        console.log({data})

        this.selectedCities = data.selectedCities || {}
        this.selectedCountries = data.selectedCountries || {}
      })
    },
    register() {
      Firebase.login().then(({user}) => {
        Firebase.db()
            .collection('usersCollection')
            .doc(user.uid)
            .set({
              selectedCountries: this.selectedCountries,
              selectedCities: this.selectedCities,
            })
      })
    },
    logout() {
      Firebase.logout()
    },
    saveToDB() {
      let data = {
        selectedCities: this.selectedCities,
        selectedCountries: this.selectedCountries,
      };

      window.localStorage.setItem('userData', JSON.stringify(data))

      if (this.isLoggedIn) {
        Firebase.db()
            .collection("usersCollection")
            .doc(this.user.data.uid)
            .update(data)
      }
    },
    async getFromDB() {
      let data

      if (this.isLoggedIn) {
        data = Firebase.db()
            .collection('usersCollection')
            .doc(this.user.data.uid).get().then(result => {
              console.log(result.data())
          return result.data()
        })
      } else {
        data = JSON.parse(window.localStorage.getItem('userData'))
      }

      return data || {
        selectedCities: [],
        selectedCountries: [],
      }
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
    fetchGeoJson(cca3) {
      if (!cca3) return

      const countryCode = cca3

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
