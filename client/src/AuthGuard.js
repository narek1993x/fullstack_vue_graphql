import store from './store/store';

export default (to, from, next) => {
  if (!store.getters.user) {
    // next({
    //   path: '/signin'
    // });
    localStorage.setItem('setAuthRedirectPath', to.path);
  } else {
    next();
  }
};
