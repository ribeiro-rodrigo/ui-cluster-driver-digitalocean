/*!!!!!!!!!!!Do not change anything between here (the DRIVERNAME placeholder will be automatically replaced at buildtime)!!!!!!!!!!!*/
// https://github.com/rancher/ui/blob/master/lib/shared/addon/mixins/cluster-driver.js
import ClusterDriver from 'shared/mixins/cluster-driver';
import C from 'shared/utils/constants';

// do not remove LAYOUT, it is replaced at build time with a base64 representation of the template of the hbs template
// we do this to avoid converting template to a js file that returns a string and the cors issues that would come along with that
const LAYOUT;
/*!!!!!!!!!!!DO NOT CHANGE END!!!!!!!!!!!*/

/*!!!!!!!!!!!GLOBAL CONST START!!!!!!!!!!!*/
// EMBER API Access - if you need access to any of the Ember API's add them here in the same manner rather then import them via modules, since the dependencies exist in rancher we dont want to expor the modules in the amd def
const computed = Ember.computed;
const observer = Ember.observer;
const get = Ember.get;
const set = Ember.set;
const setProperties = Ember.setProperties;
const alias = Ember.computed.alias;
const service = Ember.inject.service;
const equal = Ember.computed.equal;
const next = Ember.run.next;

const VERSIONS = ['1.15', '1.14', '1.13']; // sort newest->oldest so we dont have to run any logic to sort like other provider versions

/*!!!!!!!!!!!GLOBAL CONST END!!!!!!!!!!!*/


const languages = {
    'en-us': {
        'clusterNew': {
            'doks': {
                'access': {
                    'title': 'Account Access',
                    'subtitle': 'Configure the Personal access token',
                    'tokenField': 'Token',
                    'tokenPlaceholder': 'Your access token',
                    'tokenInfo': 'Personal access tokens function like a combined name and password for API authentication',
                    'tokenProvided': 'Provided',
                    'next': 'Next: Configure Cluster',
                    'loading': 'Loading',
                    'error': {
                        'requiredName': 'Name is required',
                        'requiredToken': 'Token is required'
                    }
                },
                'cluster': {
                    'next': 'Next: Select Node Pool',
                    'title': 'Cluster Options',
                    'subtitle': 'Define the region, VPC and Kubernetes version of the cluster',
                    'kubernetesVersionField': 'Kubernetes Version',
                    'regionField': 'Region',
                    'vpcField': 'VPC',
                },
                'nodePool': {
                    'title': 'Node Pool',
                    'subtitle': 'Choose cluster capacity',
                    'nameField': 'Node Pool Name',
                    'namePlaceholder': 'Enter Node Pool Name',
                    'machineTypeField': 'Machine Type',
                    'numberNodesField': 'Number Nodes',
                    'error': {
                        'requiredNodePoolName': 'Node pool name is required',
                    }
                },
                'loading': 'Loading',

            }
        }
    }
}


/*!!!!!!!!!!!DO NOT CHANGE START!!!!!!!!!!!*/
export default Ember.Component.extend(ClusterDriver, {
    session: service(),
    intl: service(),
    driverName: '%%DRIVERNAME%%',
    configField: '%%DRIVERNAME%%EngineConfig', // 'googleKubernetesEngineConfig'
    app: service(),
    router: service(),
    /*!!!!!!!!!!!DO NOT CHANGE END!!!!!!!!!!!*/
    versionChoiceService: service('version-choices'),
    settings: service(),
    defaultK8sVersionRange: alias(`settings.${C.SETTING.VERSION_SYSTEM_K8S_DEFAULT_RANGE}`),
    step: 1,
    errors: [],
    kubernetesVersionContent: VERSIONS,
    editing: equal('mode', 'edit'),
    config: alias('cluster.%%DRIVERNAME%%EngineConfig'),

    init() {
        /*!!!!!!!!!!!DO NOT CHANGE START!!!!!!!!!!!*/
        // This does on the fly template compiling, if you mess with this :cry:
        const decodedLayout = window.atob(LAYOUT);
        const template = Ember.HTMLBars.compile(decodedLayout, {
            moduleName: 'shared/components/cluster-driver/driver-%%DRIVERNAME%%/template'
        });
        set(this, 'layout', template);

        this._super(...arguments);
        /*!!!!!!!!!!!DO NOT CHANGE END!!!!!!!!!!!*/

        const lang = get(this, 'session.language');
        get(this, 'intl.locale');
        this.loadLanguage(lang);

        let config = get(this, 'cluster.%%DRIVERNAME%%EngineConfig');
        let configField = get(this, 'configField');

        if (!config) {
            config = this.get('globalStore').createRecord({
                type: configField,
                token: null,
                region: 'us-west-2',
                instanceType: 'm5.large',
                desiredNodes: 1,
                minimumNodes: 1,
                maximumNodes: 1,
                nodePoolName: '',
                kubernetesVersion: this.kubernetesVersionContent.firstObject,
            });
            set(this, 'cluster.%%DRIVERNAME%%EngineConfig', config);
        } else {
            if (this.mode === 'edit') {
                setProperties(this, {
                    vpcSubnetMode: 'custom',
                    serviceRoleMode: 'custom',
                });

                if (get(this, 'cluster.hasSessionToken')) {
                    set(this, 'cluster.%%DRIVERNAME%%EngineConfig.accessKey', null);
                }

            }

        }
    },

    willDestroyElement() {
        setProperties(this, {
            step: 1,
            clients: null,
            allSubnets: null,
        });
    },

    config: alias('cluster.%%DRIVERNAME%%EngineConfig'),

    actions: {

        digitalOceanLogin(cb) {

            if (!this.validate()) {
                cb(false)
                return
            }

            set(this, 'step', 2)
            cb()
        },
        configureNodePool(cb) {
            set(this, 'step', 3)
            cb()
        },

        save(cb) {

            if (!this.validate()) {
                return cb(false)
            }

            //this.send('driverSave', cb);
            cb(false)
        },
        cancel() {
            // probably should not remove this as its what every other driver uses to get back
            get(this, 'router').transitionTo('global-admin.clusters.index');
        },
    },
    loadLanguage(lang) {
        const translation = languages[lang] || languages['en-us'];
        const intl = get(this, 'intl');

        intl.addTranslations(lang, translation);
        intl.translationsFor(lang);
        set(this, 'refresh', false);
        next(() => {
            set(this, 'refresh', true);
            set(this, 'lanChanged', +new Date());
        });
    },

    languageChanged: observer('intl.locale', function () {
        const lang = get(this, 'intl.locale');

        if (lang) {
            this.loadLanguage(lang[0]);
        }
    }),

    desiredNodesChanged: observer('cluster.%%DRIVERNAME%%EngineConfig.desiredNodes', function () {
        const desiredNodes = get(this, 'cluster.%%DRIVERNAME%%EngineConfig.desiredNodes');
        const config = get(this, 'cluster.%%DRIVERNAME%%EngineConfig');

        setProperties(config, {
            minimumNodes: desiredNodes,
            maximumNodes: desiredNodes
        })
    }),

    versionChoices: computed('versions', function () {
        let versionChoices = [
            { label: "aaa", value: "aaa" }
        ]

        return versionChoices;
    }),

    willSave() {

    },

    // Add custom validation beyond what can be done from the config API schema
    validate() {
        // Get generic API validation errors
        this._super();

        const intl = get(this, 'intl');

        var errors = get(this, 'errors') || [];
        if (!get(this, 'cluster.name')) {
            errors.push(intl.t('clusterNew.doks.access.error.requiredName'));
        }

        if (!get(this, 'config.token') || !get(this, 'config.token').trim()) {
            errors.push(intl.t('clusterNew.doks.access.error.requiredName'))
        }

        const step = get(this, 'step');

        if (!get(this, 'config.nodePoolName') && step == 3) {
            errors.push(intl.t('clusterNew.doks.nodePool.error.requiredNodePoolName'))
        }

        // Set the array of errors for display,
        // and return true if saving should continue.
        if (get(errors, 'length')) {
            set(this, 'errors', errors);
            return false;
        } else {
            set(this, 'errors', null);
            return true;
        }
    },

    // Any computed properties or custom logic can go here
});