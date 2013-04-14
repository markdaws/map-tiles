var should = require('should'),
    PoiStore = require('../').PoiStore,
    Wrench = require('wrench');
    
describe('PoiStore', function() {

    var tempDir = __dirname + '/temp';
	beforeEach(function(done) {
		Wrench.rmdirSyncRecursive(tempDir, true);
		Wrench.mkdirSyncRecursive(tempDir, 0777);
		done();
	});
    
    it('foo', function(done) {
        
        var poiStore = new PoiStore({ outputDir: tempDir });

        //47.6097° N, 122.3331° W
        var p1 = {
            id: 1,
            latitude: -50,
            longitude: -120,
            levelOfDetail: 15
        };
        
        poiStore.add(p1, function(error) {
            console.log('add cb: ' + JSON.stringify(error));
            poiStore.dispose(function(error) {
                console.log('dispose cb: ' + JSON.stringify(error));
                done();
            });
        });
    });

    it('build levels', function(done) {

        //TODO: Change name of outputDir, tielPath);
        var poiStore = new PoiStore({ outputDir: tempDir });
        
        var poiProvider = {
            poi: [
                {
                    id: 0,
                    latitude: -50,
                    longitude: -120,
                    levelOfDetail: 15
                },
                {
                    id: 1,
                    latitude: -50,
                    longitude: -120,
                    levelOfDetail: 15
                },
                {
                    id: 2,
                    latitude: -50,
                    longitude: -120,
                    levelOfDetail: 15
                },
                {
                    id: 3,
                    latitude: -50,
                    longitude: -120,

                    // ignored
                    levelOfDetail: 15
                }
            ],
            currentPoiIndex: 0,

            get: function(id, callback) {
                var self = this;
                process.nextTick(function() {
                    callback(null, self.poi[id]);
                });
            },

            next: function(callback) {
                if (this.currentPoiIndex >= this.poi.length) {
                    process.nextTick(function() {
                        callback();
                        return;
                    });
                }

                var self = this;
                process.nextTick(function() {
                    callback(null, self.poi[self.currentPoiIndex++]);
                });
            },

            createLevelFilter: function() {

                return {
                    pois: [],
                    add: function(poi) {
                        this.pois.push(poi);
                    },
                    filter: function() {
                        this.pois.sort(function(a, b) {
                            return b.id - a.id;
                        });
                        return this.pois.slice(0, 2);
                    }
                };
            }
        };


        PoiStore.build(poiProvider, tempDir, function(error) {
            if (error) throw error;

            //What tiles should be available and what is their content
            done();
        });
    });
});
