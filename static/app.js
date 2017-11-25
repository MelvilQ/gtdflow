if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js');
}

var app = new Vue({
    el: '#vue-container',
    data: {
        router: null,
        activities: [],
        visibleActivities: [],
        projects: [],
        selectedProject: -1,
        showHiddenProjects: false,
        filter: 'hot',
        newActivityText: '',
        newProjectName: '',
        token: null,
        username: '',
        password: '',
        loginSuccessful: false,
        loginFailed: false,
        loadingData: false,
        offlineMode: false,
        addingActivity: false,
        addingProject: false
    },
    computed: {
        loggedIn: function(){
            return !!Cookies.get('session') || this.loginSuccessful;
        }
    },
    created: function(){
        this.router = new Navigo(null, true, '#');
        this.router.on('/:project/:filter', (params) => {
            if(parseInt(params.project)){
                this.selectedProject = parseInt(params.project);
            } else {
                this.selectedProject = -1;
            }
            if(params.filter){
                this.filter = params.filter.toLowerCase();
            } else {
                this.filter = "hot";
            }
            this.filterActivities();
        }).resolve();
    },
    mounted: function(){
        if(this.loggedIn){
            this.loadData();
        }
    },
    methods: {
        login: function(){
            axios.post('/api/login', {username: this.username, password: this.password})
            .then((response) => {
                this.loginSuccessful = true;
                this.loadData();
            })
            .catch((error) => {
                this.loginFailed = true;
            });
        },
        logout: function(){
            axios.post('/api/logout')
            .then((response) => {
                this.loginSuccessful = false;
                Cookies.remove('session');
                location.reload();
            })
            .catch((error) => console.log(error));
        },
        loadData: function(){
            this.loadingData = true;
            axios.all([
                axios.get('/api/activities'),
                axios.get('/api/projects')
            ])
            .then(axios.spread((activities, projects) => {
                this.loadingData = false;
                activities.data.forEach((a) => {
                    a.textEditing = false;
                    a.textInput = null;
                    a.dateDueEditing = false;
                    a.dateDueInput = null;
                });
                this.activities = activities.data;
                projects.data.forEach((p) => {
                    p.nameEditing = false;
                    p.nameInput = null;
                });
                this.projects = projects.data;
                this.filterActivities();
            }))
            .catch((error) => {
                this.loadingData = false;
                this.offlineMode = true;
                console.log(error);
            });
        },
        displayHiddenProjects: function(){
            this.showHiddenProjects = true;
        },
        selectProject: function(projectId){
            this.router.navigate('/' + projectId + '/' + this.filter);
        },
        addProject: function(){
            var project = {
                name: this.newProjectName.trim(),
                hidden: false
            };
            if(project.name.length === 0)
                return;
            this.addingProject = true;
            axios.post('/api/project', project)
            .then((response) => {
                this.addingProject = false;
                project.id = response.data;
                project.nameEditing = false;
                project.nameInput = null;
                this.projects.push(project);
                this.newProjectName = '';
                this.selectProject(project.id);
            })
            .catch((error) => {
                this.addingProject = false;
                console.log(error);
            });
        },
        editProjectName: function(p){
            p.nameEditing = true;
            p.nameInput = p.name;
        },
        setName: function(p){
            p.nameEditing = false;
            if(p.nameInput.trim() && p.name !== p.nameInput.trim()){
                p.name = p.nameInput.trim();
                this.updateProject(p);
            }
        },
        updateProject: function(p){
            axios.put('/api/project/' + p.id, p)
            .then((response) => console.log('updated project ' + p.id))
            .catch((error) => console.log(error));
        },
        hideProject: function(p){
            p.hidden = true;
            this.updateProject(p);
        },
        unhideProject: function(p){
            p.hidden = false;
            this.updateProject(p);
        },
        deleteProject: function(p){
            axios.delete('/api/project/' + p.id)
            .then((response) => {
                var i = this.projects.indexOf(p);
                this.projects.splice(i, 1);
                this.cleanActivityList(p.id)
                this.selectProject(-1);
            })
            .catch((error) => console.log(error));
        },
        cleanActivityList: function(projectId){
            this.activities = this.activities.filter((a) => (a.project !== projectId));
        },
        filterActivities: function(){
            this.visibleActivities = this.activities.filter((a) => {
                var passShowAll = (this.filter === 'all');
                var passShowInactive = (this.filter === 'inactive' && a.status !== 'DONE');
                var passShowActive = (this.filter === 'active' && a.status !== 'DONE' && a.status !=='INACTIVE');
                var passShowHot = (this.filter === 'hot' && a.status === 'HOT');
                var isUrgent = moment().add(1, 'weeks') >= moment(a.dateDue);
                var passShowUrgent = (this.filter === 'hot' && a.status !== 'DONE' && isUrgent);
                var passStatusFilter = passShowAll || passShowInactive || passShowActive || passShowHot || passShowUrgent;
                var passProjectFilter = (this.selectedProject === -1 || a.project === this.selectedProject);
                return passProjectFilter && passStatusFilter; 
            });
        },
        addActivity: function(){
            var activity = {
                text: this.newActivityText.trim(),
                project: this.selectedProject,
                dateCreated: moment().format('YYYY-MM-DD')
            };
            if(activity.text.length === 0)
                return;
            this.addingActivity = true;
            axios.post('/api/activity', activity, this.authHeader)
            .then((response) => {
                this.addingActivity = false;
                activity.id = response.data;
                activity.textEditing = false;
                activity.status = 'ACTIVE';
                activity.dateDue = null;
                activity.dateDueEditing = false;
                activity.dateDueInput = null;                
                this.activities.push(activity);
                this.filterActivities();
                this.newActivityText = '';
            })
            .catch((error) => {
                this.addingActivity = false;
                console.log(error);
            });
        },
        deleteActivity: function(a){
            axios.delete('/api/activity/' + a.id)
            .then((response) => {
                var i = this.activities.indexOf(a);
                this.activities.splice(i, 1);
                this.filterActivities();
            })
            .catch((error) => console.log(error));
        },
        updateActivity: function(a){
            axios.put('/api/activity/' + a.id, a)
            .then((response) => console.log("updated activity " + a.id))
            .catch((error) => console.log(error));
        },
        editActivityText: function(a){
            a.textEditing = true;
            a.textInput = a.text;
        },
        setText: function(a){
            a.textEditing = false;
            if(a.textInput.trim() && a.text !== a.textInput.trim()){
                a.text = a.textInput.trim();
                this.updateActivity(a);
            }
        },
        setDone: function(a){
            a.status = 'DONE';
            a.dateMarkedDone = moment().format('YYYY-MM-DD');
            this.updateActivity(a);
        },
        setHot: function(a){
            a.status = 'HOT';
            this.updateActivity(a);
        },
        setActive: function(a){
            a.status = 'ACTIVE';
            this.updateActivity(a);
        },
        setInactive: function(a){
            a.status = 'INACTIVE';
            this.updateActivity(a);
        },
        setWeblink: function(a, link){
            a.weblink = weblink;
            this.updateActivity(a);
        },
        unsetWeblink: function(a){
            a.weblink = null;
            this.updateActivity(a);
        },
        setFilter: function(filter){
            this.router.navigate('/' + this.selectedProject + '/' + filter);
        },
        activateDueDate: function(a){
            a.dateDueEditing = true;
            a.dateDueInput = a.dateDue;
        },
        setDueDate: function(a){
            if(!a.dateDueInput || !moment(a.dateDueInput).isValid())
                return;
            a.dateDue = moment(a.dateDueInput).format('YYYY-MM-DD');
            a.dateDueEditing = false;
            a.dateDueInput = null;
            this.updateActivity(a);
        },
        clearDueDate: function(a){
            a.dateDue = null;
            a.dateDueEditing = false;
            a.dateDueInput = null;
            this.updateActivity(a);
        }
    },
    directives: {
        focus: {
            update: function (el) {
                el.focus();
            }
        }
    }
});