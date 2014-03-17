Ember.FEATURES['query-params-new'] = true;
window.Browse = Ember.Application.create();
Browse.ApplicationAdapter = DS.FixtureAdapter.extend();

Browse.Router.map(function() {
    this.resource('home', {path: '/carnatic/'});
});

Browse.Router.reopen({
    location: 'history'
});

Browse.Select = DS.Model.extend({
    entity: DS.attr('string'),
    name: DS.attr('string'),
    selected: DS.attr('boolean')
});

Browse.Entity = DS.Model.extend({
    entity: DS.attr('string'),
    name: DS.attr('string'),
    items: DS.hasMany('entity-item')
});

Browse.EntityItem = DS.Model.extend({
    //id: DS.attr('number'),
    name: DS.attr('string')
});

Browse.RaagaItem = DS.Model.extend({
    //id: DS.attr('number'),
    name: DS.attr('string')
});

Browse.HomeRoute = Ember.Route.extend({
    model: function() {
        return this.store.find('select');
    }
});

/* The full view, containing the below views. */
Browse.BrowserView = Ember.View.extend({

});

/* The list of entity types */
Browse.TypeView = Ember.View.extend({

});

/* A single entity. */
Browse.EntityView = Ember.View.extend({

});

/* A list of items in an entity */
Browse.EntityListView = Ember.View.extend({

});

Browse.RaagaRoute = Ember.Route.extend({
    model: function() {
        return Ember.$.getJSON('/carnatic/raaga/search');
    },
    setupController: function(controller, model) {
        controller.set('model', model);
    }
});

Browse.SelectController = Ember.ObjectController.extend({
    isSelected: function(key, value) {
        console.debug("selected controller isselected");
        var model = this.get('model');
        if (value === undefined) {
            return model.get('selected');
        } else {
            model.set('selected', value);
            model.save();
            return model;
        }
    }.property('model.isSelected')
});

Browse.Select.FIXTURES = [
    {id: 1, entity: 'artist', name: 'Artist', selected: true},
    {id: 2, entity: 'concert', name: 'Concert', selected: false},
    {id: 3, entity: 'instrument', name: 'Instrument', selected: false},
    {id: 4, entity: 'raaga', name: 'Raaga', selected: false},
    {id: 5, entity: 'taala', name: 'Taala', selected: false},
];
