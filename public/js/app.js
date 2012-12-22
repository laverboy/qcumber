/*global Backbone, _, dateFormat */
/*jshint devel:true */
/*jshint bitwise:false */

$('body').ajaxStart(function(){
    $(this).addClass('loading');
});
$('body').ajaxStop(function(){
    $(this).removeClass('loading');
});

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
        
    },
    statusList : {
        '1' : 'Started',
        '2' : '10%',
        '3' : '20%',
        '4' : '30%',
        '5' : '40%',
        '6' : '50%',
        '7' : '60%',
        '8' : '70%',
        '9' : '80%',
        '10' : '90%',
        '11' : 'Ready',
        '12' : 'Launched',
        '14' : 'Postponed',
        '0'  : 'Stopped'
    }
};

/* -------------------------------------- */
/*           Router                       */
/* -------------------------------------- */

App.Routes = Backbone.Router.extend({
    routes: {
        ""                  : "home",
        ":id"               : "showProject"
    },
    home: function () {
        RegionManager.show(new App.View.Home({collection: App.projects}));
        App.projects.trigger('reset');
    },
    showProject: function (id) {
        RegionManager.show(new App.View.ShowProject({model: App.projects.get(id)}));
    }
});

/* -------------------------------------- */
/*           Models 'n' Stuff             */
/* -------------------------------------- */

App.Model.Project = Backbone.Model.extend({
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
    url: 'projects'
});

App.Model.Task = Backbone.Model.extend({
    defaults: {
        'percent' : 1
    }
});
App.Collection.Tasks = Backbone.Collection.extend({
    model: App.Model.Task,
    url: 'tasks',
    initialize: function  () {
        this.on('change:percent', this.calculateTotalPercentage);
        this.on('reset', this.calculateTotalPercentage);
    },
    calculateTotalPercentage: function  () {
        var taskarray = this.pluck('percent');
        var newarray = _.filter(taskarray, function (value) {
            return _.indexOf([2,3,4,5,6,7,8,9,10], parseInt(value, 10)) >= 0;
        });

        var array_to_calculate = _.map(newarray, function (el, i) {
            var a = App.statusList[parseInt(el, 10)].slice(0,-1);
            return parseInt(a, 10);
        });

        var total = _.reduce(array_to_calculate, function (memo, num) {
            return memo + num;
        }, 0);

        this.total = Math.round( total / (newarray.length * 100) * 100 );
        this.trigger('totalchange', this.total);

        // TODO: if 0, and Ready needs changing to 100%
    }
});

App.Model.Note = Backbone.Model.extend({
    defaults: {
        'text'       : ''
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
        'click h2'     : 'navigate',
        'keydown h2'   : 'stop',
        'blur h2'      : 'blur',
        'click .delete' : 'removeProject'
    },
    initialize: function () {
        _.bindAll(this, 'edit', 'stop');
        this.on('edit', this.edit, this);
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        if (this.model.isNew()) {
            this.$el.addClass('editing');
        }
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
    blur: function  () {
        this.$('h2').attr('contentEditable', 'false');
        if (this.model.isNew() || this.$('h2').text() === 'untitled project'){
            this.removeProject();
        }
    },
    stop: function (e) {
        // if return is pressed blur out
        if (e.which === 13) {
            e.preventDefault();
            this.saveModel();
        }
        // if esc is pressed cancel changes
        if (e.which === 27) {
            document.execCommand('undo');
            e.target.blur();
            e.preventDefault();
        }
    },
    saveModel: function () {
        var newProject = this.$('h2').text();
        
        // if project still has default name
        if (newProject === 'untitled project') {
            this.$('h2').blur();
            return;
        }
        this.model.save({name: newProject}, {success: function () {this.$('h2').blur();}});
        this.$el.removeClass('editing');
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
        'click .new'     : 'addNewTask',
        'click .back'    : 'home'
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

        this.collection.on('totalchange', this.setTotal, this);
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
    setTotal: function (val) {
        this.$('.total').text(val);
    },
    home: function (e) {
        e.preventDefault();
        Backbone.history.navigate('', {trigger: true});
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
        'click h4'             : 'toggleNotes',
        'keydown h4'           : 'stop',
        'change .statusSelect' : 'changeStatus',
        'blur h4'              : 'blur'
    },
    initialize: function () {
        _.bindAll(this, 'loadNotes', 'hideNotes', 'addNote', 'edit');
        
        this.on('edit', this.edit, this);
        this.model.on('change:percent', this.setStatus, this);
        
        this.notesShown = false;
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        this.setStatus();
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
    changeStatus: function  () {
        var newstatus = this.$('.statusSelect').val();
        this.model.save({percent: newstatus});
    },
    setStatus: function () {
        var percent = this.model.get('percent');
        this.$('.status').text(App.statusList[percent]);
    },
    edit: function () {
        this.$('h4').attr('contentEditable', 'true').focus();
        this.$('h4').on('blur', function () {
            $(this).attr('contentEditable', 'false');
        });
    },
    blur: function  () {
        this.$('h4').attr('contentEditable', 'false');
        if (this.model.isNew() || this.$('h4').text() === 'untitled task'){
            this.removeTask();
        }
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
        var json = this.model.toJSON();
        if (this.model.isNew()) {
            json.created_at = ""
        } else {
            json.created_at = dateFormat(json.created_at, "dS mmm yy");   
        }
        this.$el.html(this.template(json));
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