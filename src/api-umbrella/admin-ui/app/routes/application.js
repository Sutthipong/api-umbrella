// eslint-disable-next-line ember/no-mixins
import ApplicationRouteMixin from 'ember-simple-auth/mixins/application-route-mixin';
import Route from '@ember/routing/route';
import { inject } from '@ember/service';
import isString from 'lodash-es/isString';
// eslint-disable-next-line ember/no-observers
import { observer } from '@ember/object';

export default Route.extend(ApplicationRouteMixin, {
  busy: inject('busy'),

  // By default, ember-simple-auth sets the "session.attemptedTransition" value
  // to track where to redirect unauthenticated users to after logging in.
  // However, since we're using a server-side login page, this variable
  // disappears after the server-side login redirect. So instead, we'll store
  // just the string value of the attempted transition and persist it in the
  // session store so it's available after the server-side login.
  //
  // eslint-disable-next-line ember/no-observers
  attemptedTransitionChange: observer('session.attemptedTransition', function() {
    const attemptedTransition = this.session.attemptedTransition;
    if(attemptedTransition) {
      this.session.set('data.attemptedTransitionUrl', attemptedTransition.intent.url);
    } else {
      this.session.set('data.attemptedTransitionUrl', null);
    }
  }),

  // After successfully logging in, then redirect to the URL the user was
  // originally trying to access. Since we're using a server-side login page,
  // we need to do this a little differently than ember-simple-auth's default
  // mechanism. We need to use the "attempedTransitionUrl" string value we
  // persist in the session store.
  sessionAuthenticated() {
    const attemptedTransitionUrl = this.session.data.attemptedTransitionUrl;
    if(attemptedTransitionUrl) {
      this.transitionTo(attemptedTransitionUrl);
      this.set('session.attemptedTransition', null);
      this.session.set('data.attemptedTransitionUrl', null);
    } else {
      this.transitionTo(this.routeAfterAuthentication);
    }
  },

  actions: {
    loading(transition) {
      let busy = this.busy;
      busy.show();
      transition.promise.finally(function() {
        busy.hide();
      });
    },

    refreshCurrentRoute(){
      this.refresh();
    },

    error(error) {
      if(error) {
        let errorMessage = error.stack
        if(!errorMessage) {
          errorMessage = error;
          // Very long text error messages can seem to hang some of the console
          // tools, so truncate the messages.
          if(isString(errorMessage)) {
            errorMessage = errorMessage.substring(0, 1000);
          }
        }
        // eslint-disable-next-line no-console
        console.error(errorMessage);
        this.busy.hide();
        return this.intermediateTransitionTo('error');
      }
    },
  },
});
