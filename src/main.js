import Vue from 'vue'
import App from './App.vue'
import Vue2TouchEvents from 'vue2-touch-events'
import './assets/tailwind.css'

import Autocomplete from '@trevoreyre/autocomplete-vue'

Vue.use(Autocomplete)

Vue.use(Vue2TouchEvents)

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
