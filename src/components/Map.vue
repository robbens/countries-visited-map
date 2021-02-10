<template>
  <div>
    <div class="map-input">
      <vue-autosuggest
          v-model="query"
          :suggestions="filteredCountries"
          :get-suggestion-value="getSuggestionValue"
          :input-props="{id:'autosuggest__input', placeholder: 'Enter a country'}"
          @selected="addCountry($event.item.cca3)"
      >
        <div slot-scope="{suggestion}" style="display: flex; align-items: center;">
          <img :src="`/countries/${suggestion.item.cca3.toLowerCase()}.svg`"
               :style="{ display: 'flex', width: '25px', height: '25px', marginRight: '10px'}" width="50">
          <div style="{ display: 'flex', color: 'navyblue'}">{{ suggestion.item.name.common }}</div>
        </div>
      </vue-autosuggest>

      <button class="button" @click="modalOpen = !modalOpen">Select multiple</button>

      <div class="percent-visited">
        {{ roundNumber((selectedCountries.length / 195) * 100) }}%
      </div>
    </div>

    <div id="modal-select-countries" :class="{'open': modalOpen}">
      <span class="modal-close" @click="modalOpen = false">&times;</span>

      <div class="region" v-for="(countries, region) in filteredCountriesByRegion" :key="region">
        <h2>{{ region }}</h2>
        <div
            v-for="country in countries"
            class="country"
            :key="country.cca3"
            :class="{'active': selectedCountries.includes(country.cca3)}"
            @click="addCountry(country.cca3)"
        >
          {{ country.name.common }}
        </div>
      </div>
    </div>

    <Mapbox style="height: 100vh;" :zoom="2" :center="[-3.749220, 40.463669]">
      <MglGeojsonLayer
          v-for="country in selectedCountries"
          :key="country"
          :sourceId="country"
          :source="countryGeoData[country]['source']"
          :layerId="country"
          :layer="countryGeoData[country]['layer']"
      />
    </Mapbox>
  </div>
</template>

<script>
import countries from './countries.json'
import {VueAutosuggest} from 'vue-autosuggest';
import Mapbox from "@/components/Mapbox";
import {MglGeojsonLayer} from "vue-mapbox";

export default {
  name: 'Map',
  components: {Mapbox, MglGeojsonLayer, VueAutosuggest},
  data() {
    return {
      query: '',
      map: null,
      selectedCountries: [],
      countryGeoData: {},
      modalOpen: false,
    }
  },

  created() {
    const selectedCountries = JSON.parse(window.localStorage.getItem('selectedCountries')) || []

    this.initCountries(selectedCountries)
  },

  watch: {
    selectedCountries(val) {
      window.localStorage.setItem('selectedCountries', JSON.stringify(val))
    }
  },

  computed: {
    countries() {
      return countries.filter(c => c.independent)
    },
    filteredCountriesByRegion() {
      return this.groupBy(this.countries, 'region')
    },
    filteredCountries() {
      return [
        {
          data: this.countries.filter(country => {
            return country.name.common.toLowerCase().startsWith(this.query.toLowerCase())
          })
        }
      ];
    }
  },

  methods: {
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

      this.query = ''

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
        this.selectedCountries.push(countryCode)
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

.country {
  cursor: pointer;
  padding: 3px;
}

.country:hover {
  opacity: 0.7;
}

.country.active {
  font-weight: bold;
}

.modal-close {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 40px;
  margin: 0 14px;
  cursor: pointer;
}

#autosuggest__input {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px 12px;
  width: 100%;
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

.button {
  background: #2caaa0;
  border: 0;
  color: #fff;
  border-radius: 4px;
  padding: 6px;
  font-size: 12px;
  width: 100%;
  flex: 0 0 120px;
  margin-left: 20px;
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
}
</style>
