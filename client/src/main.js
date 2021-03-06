import '@babel/polyfill';
import Vue from 'vue';
import './plugins/vuetify';
import App from './App.vue';
import router from './router';
import store from './store/store';

import ApolloClient from 'apollo-boost';
import VueApollo from 'vue-apollo';
import moment from 'moment';

import FormAlert from './components/Shared/FormAlert';

// Register Global Component
Vue.component('form-alert', FormAlert);

// Add Global Filter to format date
Vue.filter('formatDate', (date) => moment(new Date(date)).format('ll'));
Vue.filter('getTimeFromNow', (time) => moment(new Date(time)).fromNow());

Vue.use(VueApollo);

// Setup ApolloClient
export const defaultClient = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  // include auth token with requests made to backend
  fetchOptions: {
    credentials: 'include'
  },
  request: (operation) => {
    if (!localStorage.token) {
      localStorage.setItem('token', '');
    }
    // operation adds the token to an authorization header, which is sent to backend
    operation.setContext({
      headers: {
        authorization: localStorage.getItem('token')
      }
    });
  },
  onError: ({ graphQLErrors, networkError }) => {
    if (networkError) {
      console.log('[networkError]', networkError);
    }

    if (graphQLErrors) {
      for (let err of graphQLErrors) {
        console.dir(err);
        if (err.name === 'AuthenticationError') {
          // set auth error in state (to show in snackbar)
          store.commit('setAuthError', err);
          // signout user (to clear token)
          store.dispatch('signOutUser');
        }
      }
    }
  }
});

const apolloProvider = new VueApollo({ defaultClient });

Vue.config.productionTip = false;

new Vue({
  provide: apolloProvider.provide(),
  router,
  store,
  render: (h) => h(App),
  created() {
    // execute getCurrentUser query
    this.$store.dispatch('getCurrentUser').then((currentUser) => {
      const authRedirectPath = localStorage.getItem('setAuthRedirectPath');
      const { routes } = this.$router.options;
      const isProtectRoute = routes.filter((r) => r.beforeEnter).some((r) => r.path === window.location.pathname);

      if (currentUser && authRedirectPath) {
        this.$router.push(authRedirectPath);
        localStorage.removeItem('setAuthRedirectPath');
      } else if (!currentUser && isProtectRoute) {
        this.$router.push('/signin');
      }
    });
  }
}).$mount('#app');
