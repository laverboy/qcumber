/*global Backbone, _ */
/*jshint devel:true */
/*jshint bitwise:false */

/* -------------------------------------- */
/*           View Helper                  */
/* -------------------------------------- */

var RegionManager = (function (Backbone, $) {
    var currentView;
    var el = "#container";
    var region = {};

    var closeView = function (view) {
        if (view && view.close) {
            view.close();
        }
    };

    var openView = function (view) {
        view.render();
        view.$el.addClass('animated fadeIn');
        $(el).html(view.el);
    };

    region.show = function (view) {
        closeView(currentView);
        currentView = view;
        openView(currentView);
    };

    return region;
})(Backbone, jQuery);

/* -------------------------------------- */
/*           Containing Function          */
/* -------------------------------------- */

var App = {
    View: {},
    Collection: {},
    Model: {},
    init: function(initialCollection) {
		
		this.projects = new App.Collection.Projects();
		this.projects.reset(initialCollection);
		
		var appRoutes;
        appRoutes = new App.Routes();
        
        Backbone.history.start();
        
    }
};

/* -------------------------------------- */
/*           Router                       */
/* -------------------------------------- */

App.Routes = Backbone.Router.extend({
    routes: {
        ""                  : "home",
        ":id"               : "showProject",
        "users"             : "showUsers",
        "login"             : "showLogin"
    },
    home: function () {
        RegionManager.show(new App.View.Home({collection: App.projects}));
        App.projects.trigger('reset');
    },
    showProject: function (id) {
        RegionManager.show(new App.View.ShowProject({model: App.projects.get(id)}));
    },
    showUsers: function () {
        var items = new App.Collection.Items();
        items.fetch({data: {name: 'news', url: 'http://www.message.org.uk/category/news/feed/'}});
        RegionManager.show(new App.View.Items({collection: items, title: "News"}));
    },
    showLogin: function () {
        var items = new App.Collection.Items();
        items.fetch({data: {name: 'flow', url: 'http://podcast.message.org.uk/feed/flowpodcast'}});
        RegionManager.show(new App.View.Items({collection: items, title: "Flow", type: "podcast"}));
    }
});

/* -------------------------------------- */
/*           Models 'n' Stuff             */
/* -------------------------------------- */

App.Model.Project = Backbone.Model.extend({
    url: '/projects',
    defaults: {
        'name'         : 'New Project'
    },
    validate: function (attrs) {
        if (attrs.name === '' || !attrs.name) {
            return "It definitley needs a name!";
        }
    }
});
App.Collection.Projects = Backbone.Collection.extend({
    model: App.Model.Project,
    url: '/projects'
});

App.Model.Task = Backbone.Model.extend({});
App.Collection.Tasks = Backbone.Collection.extend({
    model: App.Model.Task,
    url: 'tasks'
});

App.Model.Note = Backbone.Model.extend({
    defaults: {
        'text' : ''
    },
    collection: App.Collection.Notes
});
App.Collection.Notes = Backbone.Collection.extend({
    model: App.Model.Note,
    url: 'notes'
});

/* -------------------------------------- */
/*           Home                         */
/* -------------------------------------- */

App.View.Home = Backbone.View.extend({
    tagName: 'section',
    id: 'home',
    template: _.template($('#homeTemplate').html()),
    events: {
        "click .new"    : "addProject",
        "click .show"   : "navigateToId"
    },
    initialize: function () {
        _.bindAll(this, 'addOne', 'addAll');
        this.collection.bind('add', this.addOne, this);
        this.collection.bind('reset', this.addAll, this);
    },
    render: function () {
        this.$el.html(this.template());
        return this;
    },
    addOne: function (project) {
        var view = new App.View.ProjectMenuItem({model:project});
        this.$('#projects').append(view.render().el);
        if (view.model.isNew()) { 
            view.trigger('edit');
        }
    },
    addAll: function () {
        this.collection.each(this.addOne);
    },
    addProject: function (e) {
        e.preventDefault();
        var newProject = new App.Model.Project({name: 'untitled project'});
        newProject.collection = this.collection;
        this.addOne(newProject);
    },
    navigateToId: function () {
        
    },
    close: function(){
        this.remove();
        this.unbind();
    }
});

App.View.ProjectMenuItem = Backbone.View.extend({
    className: 'ProjectMenuItem',
    template: _.template($('#ProjectMenuItem').html()),
    events: {
        'click'  : 'navigate',
        'keydown h2' : 'stop'
    },
    initialize: function () {
        _.bindAll(this, 'edit', 'stop');
        this.on('edit', this.edit, this);
        this.on('blur', 'h2', function () {
            $(this).attr('contentEditable', 'false');
        });
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    navigate: function (e) {
        e.preventDefault();
        var url = this.model.get('id');
        Backbone.history.navigate('' + url, {trigger: true});
    },
    edit: function () {
        this.$('h2').attr('contentEditable', 'true').focus();
    },
    stop: function (e) {
        // if return is pressed blur out
        if (e.which === 13) {
            e.target.blur();
            e.preventDefault();
            this.saveModel();
        }
        // if esc is pressed cancel changes
        if (e.which === 27) {
            document.execCommand('undo');
            e.target.blur();
            e.preventDefault();
            
            if ( this.model.isNew() ) {
                this.removeProject();
            }
        }
    },
    saveModel: function () {
        var newProject = this.$('h2').text();
        this.model.save({name: newProject});
    },
    removeProject: function (e) {
        if (e) e.preventDefault();
        this.model.destroy();
        this.remove();
    }
});

/* -------------------------------------- */
/*           Show Project                 */
/* -------------------------------------- */

App.View.ShowProject = Backbone.View.extend({
    tagName: 'section',
    id: 'showProject',
    template: _.template($('#showProjectTemplate').html()),
    events: {
        'click .new'     : 'addNewTask'
    },
    initialize: function () {
        _.bindAll(this, 'loadTasks');
        
        /* Get tasks for this project */
        this.collection = new App.Collection.Tasks();
        this.collection.fetch(
            {
                data: {id: this.model.get('id')},
                success: this.loadTasks
            }
        );
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    loadTasks: function(collection) {
        /* TODO if collection empty */
        collection.each(this.addTask);
    },
    addTask: function (model) {
        var task = new App.View.Task({model: model});
        this.$('.projectTasks').append(task.render().el);
        if (task.model.isNew()) { 
            task.trigger('edit');
        }
    },
    addNewTask: function (e) {
        e.preventDefault();
        var newtask = new App.Model.Task({
            name: 'untitled task',
            project_id: this.model.get('id')
        });
        newtask.collection = this.collection;
        this.addTask(newtask);
    },
    close: function(){
        this.remove();
        this.unbind();
    }
});

App.View.Task = Backbone.View.extend({
    tagName: 'div',
    className: 'task',
    template: _.template($('#taskTemplate').html()),
    events: {
        'click h4' : 'toggleNotes',
        'keydown h4' : 'stop'
    },
    initialize: function () {
        _.bindAll(this, 'loadNotes', 'hideNotes', 'addNote', 'edit');
        this.on('edit', this.edit, this);
        this.notesShown = false;
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    toggleNotes: function () {
        if (this.notesShown === true) {
            this.hideNotes();
        } else {
            this.showNotes();
        }
    },
    showNotes: function () {
        var notes = new App.Collection.Notes();
        
        // if we have just added a new note, don't do a fetch
        if ( this.model.isNew() ) {
            this.addBlank(notes);
        } else {
            notes.fetch(
                {
                    data: {id: this.model.get('id')},
                    success: this.loadNotes
                }
            );
            // need to deal with 0 results
        }
        this.notesShown = true;
    },
    hideNotes: function () {
        this.$('.notes').html('');
        this.notesShown = false;
    },
    loadNotes: function(collection) {
        collection.each(this.addNote);

        this.addBlank(collection);
    },
    addNote: function (model) {
        var note = new App.View.Note({model: model});
        this.$('.notes').prepend(note.render().el);
    },
    addBlank: function (collection) {
        var blankNote = new App.Model.Note({ task_id : this.model.get('id')});

        //set collection so save works
        blankNote.collection = collection;

        //when a blanknote is saved add a new one
        blankNote.on('sync', this.addBlank, this);

        this.addNote(blankNote);
    },
    edit: function () {
        this.$('h4').attr('contentEditable', 'true').focus();
        this.$('h4').on('blur', function () {
            $(this).attr('contentEditable', 'false');
        });
    },
    stop: function (e) {
        // if return is pressed blur out
        if (e.which === 13) {
            e.target.blur();
            e.preventDefault();
            this.saveText();
        }
        // if esc is pressed cancel changes
        if (e.which === 27) {
            document.execCommand('undo');
            e.target.blur();
            e.preventDefault();
            
            if ( this.model.isNew() ) {
                this.removeTask();
            }
        }
    },
    saveText: function () {
        var newName = this.$('h4').text();
        this.model.save({name: newName});
    },
    removeTask: function (e) {
        if (e) e.preventDefault();
        this.model.destroy();
        this.remove();
    }
});

App.View.Note = Backbone.View.extend({
    tagName: 'div',
    className: 'note',
    template: _.template($('#noteTemplate').html()),
    events: {
        'keydown'    : 'stop',
        'click .del' : 'removeNote'
    },
    initialize: function () {
        _.bindAll(this, 'saveText', 'stop');
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    saveText: function () {
        var newText = this.$('p').text();
        this.model.save({text: newText});
    },
    stop: function (e) {
        // if return is pressed blur out
        if (e.which === 13) {
            e.target.blur();
            this.saveText();
            e.preventDefault();
        }
        // if esc is pressed cancel changes
        if (e.which === 27) {
            document.execCommand('undo');
            e.target.blur();
            e.preventDefault();
        }
    },
    removeNote: function (e) {
        e.preventDefault();
        this.model.destroy();
        this.remove();
    }
});