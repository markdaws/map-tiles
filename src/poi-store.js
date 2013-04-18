return;
var Async = require('async'),
    Fs = require('fs'),
    LRU = require('async-lru').LRU,
    Path = require('path'),
    TileSystem = require('../').TileSystem,
    _ = require('underscore');

//TODO: Logging

function PoiStore(options) {
    this._outputDir = options.outputDir;

    //TODO: Pick good number
    this._lru = new LRU({ max: 100 });
    this._getWaitingList = {};
}

/*
PoiStore.prototype.destroy = function(callback) {
    //removes all data associated with the store, including files
    //TODO:
    process.nextTick(callback);
    //TODO: Generate stitch file?
};

PoiStore.prototype._buildLevel = function(levelOfDetail, callback) {
    // for each tile in this level, get all of the contained
    // child tiles, read in their content and build a new level
    // but with only the one that should be in this level
    
    //Get new PoiStore ...
    var tileX = 0, tileY = 0;

    // get the children under this tile
    // for each child get the associated poi
    // add the poi to the filter
    // 
    var quadKey = TileSystem.tileXYToQuadKey(tileX, tileY, levelOfDetail);
    this.getTile(quadKey, function(error, tile) {
    var filter = poiProvider.createFilter(levelOfDetail);
    filter.add(poi);
    filter.execute(function(error, rankedPoi) {
        
    });
};

//should be static ?


//PoiFilter
// add(poi, function(error))
// execute(function(error, poi (ids?))


//PoiProvider
//poiProvider.createRanker()
//poiProvider.get(id, function(error, poi)
//poiProvider.next(function(error, poi)

*/

PoiStore.prototype.destroy = function(callback) {
    //TODO: Delete all existing tiles
    process.nextTick(callback);
};

PoiStore.prototype.query = function(nwLat, nwLong, seLat, seLong, zoomLevel, callback) {

    //TODO: make sure we aren't trying to fetch too much data
    var nwPixel = TileSystem.latLongToPixelXY(nwLat, nwLong, zoomLevel),
        sePixel = TileSystem.latLongToPixelXY(seLat, seLong, zoomLevel),
        nwTile = TileSystem.pixelXYToTileXY(nwPixel.x, nwPixel.y),
        seTile = TileSystem.pixelXYToTileXY(sePixel.x, sePixel.y);
        //nwQuadKey = TileSystem.tileXYToQuadKey(nwTile.x, nwTile.y, zoomLevel),
        //seQuadKey = TileSystem.tileXYToQuadKey(seTile.x, seTile.y, zoomLevel);
    
    var tileX = nwTile.x, tileY = nwTile.y;
    
    var tiles = [], self = this;
    function loadTiles(tileX, tileY, minTileX, maxTileX, maxTileY) {
        console.log('loading query tile: x:' + tileX + ', y:' + tileY + ', zl:' + zoomLevel);

        var quadKey = TileSystem.tileXYToQuadKey(tileX, tileY, zoomLevel);
        self.getTile(quadKey, function(error, tile) {
            if (error) {
                //TODO: Multiple errors
                callback(error);
                return;
            }

            tiles.push(tile);
            //console.dir(tile);
            ++tileX;
            if (tileX > maxTileX) {
                tileX = minTileX;
                ++tileY;
            }
            if (tileY > maxTileY) {
                var pois = [];
                for (var i=0; i<tiles.length; ++i) {
                    if (tiles[i].poiIds.length > 0) {
                        pois = pois.concat(tiles[i].poiIds);
                    }
                }

                //TODO: Need to get real poi from somewhere, would be in a database
                callback(null, pois);
            }
            else {
                process.nextTick(function() {
                    loadTiles(tileX, tileY, minTileX, maxTileX, maxTileY);
                });
            }
        });
    }
    loadTiles(tileX, tileY, tileX, seTile.x, seTile.y);    
};

PoiStore.prototype._buildLevels = function(poiProvider, maxLevel, minLevel, callback) {

    //console.log('bl max: ' + maxLevel + ', min:' + minLevel);

    // maxLevel will have been passed in and contain all of the data
    var currentLevel = maxLevel,
        levels = _.range(currentLevel, minLevel - 1, -1);

    console.log('building level');
    var self = this;
    Async.forEachLimit(
        levels,
        1,
        function(level, callback) {
            var maxTileIndexAtLevel = TileSystem.maxTileIndexAtLod(level);
            

            console.log('Building level: ' + level + ', max:' + maxTileIndexAtLevel);

            function processTile(tileX, tileY, maxDimension) {

                console.log('processing parent: tileX: ' + tileX + ', tileY: ' + tileY + ', max: ' + maxDimension);
                //parallelise?

                var poiLevelFilter = poiProvider.createLevelFilter();
                
                var parentTile = null;
                function loadChildPoi(childTileX, childTileY, minTileX, maxTileX, maxTileY, childLevel, callback) {
                    //console.log('Loading child: ' + childTileX + ', childTileY: ' + childTileY);

                    
                    var quadKey = TileSystem.tileXYToQuadKey(childTileX, childTileY, childLevel);
                    self.getTile(quadKey, function(error, tile) {
                        if (error) {
                            //TODO:
                            //console.dir(error);
                        }

                        Async.forEachLimit(
                            tile.poiIds,
                            5,
                            function(poiId, callback) {
                                poiProvider.get(poiId, function(error, poi) {
                                    console.dir(error);
                                    console.log('fetched poi: ' + poiId + ', ' + JSON.stringify(poi));
                                    //TODO: Error

                                    //TODO: Should not do this
                                    poi.levelOfDetail = level;

                                    // Add the poi to the list of poi we want to add for consideration
                                    // into the next level
                                    poiLevelFilter.add(poi);
                                    callback();
                                });
                            },
                            function(error) {
                                // If error
                                ++childTileX;
                                if (childTileX > maxTileX) {
                                    childTileX = minTileX;
                                    ++childTileY;
                                }
                                
                                if (childTileY > maxTileY) {
                                    callback();
                                }
                                else {
                                    // processing next row
                                    process.nextTick(function() {
                                        loadChildPoi(childTileX, childTileY, minTileX, maxTileX, maxTileY, childLevel, callback);
                                    });
                                }
                            }
                        );
                    });
                }
                loadChildPoi(
                    tileX * 2,
                    tileY * 2,
                    tileX * 2,
                    tileX * 2 + 1,
                    tileY * 2 + 1,
                    level + 1,
                    function(error) {
                        //TODO: Error

                        var filteredPoi = poiLevelFilter.filter();
                        Async.forEachLimit(
                            filteredPoi,
                            5,
                            function(poi, callback) {
                                self.add(poi, function(error) {
                                    callback(error);
                                });
                            },
                            function(error) {
                                //TODO: Error

                                ++tileX;
                                if (tileX > maxDimension) {
                                    tileX = 0;
                                    ++tileY;
                                }
                                if (tileY > maxDimension) {
                                    console.log('all done !A!A!A');
                                    callback();
                                }
                                else {
                                    process.nextTick(function() {
                                        processTile(tileX, tileY, maxDimension);
                                    });
                                }
                                
                            }
                        );
                    }
                );
            }

            //Iterate 1 by 1 through the tiles in the level
            processTile(0, 0, maxTileIndexAtLevel);
        },
        function(error) {
            callback();
        }
    );

    
    //TODO: Should have some logging ...

};

PoiStore.prototype._buildLevel = function(levelOfDetail, callback) {

    /*
    // for each tile in this level, get all of the contained
    // child tiles, read in their content and build a new level
    // but with only the one that should be in this level
    
    //Get new PoiStore ...
    var tileX = 0, tileY = 0;

    // get the children under this tile
    // for each child get the associated poi
    // add the poi to the filter
    // 
    var quadKey = TileSystem.tileXYToQuadKey(tileX, tileY, levelOfDetail);
    this.getTile(quadKey, function(error, tile) {
    var filter = poiProvider.createFilter(levelOfDetail);
    filter.add(poi);
    filter.execute(function(error, rankedPoi) {
        
    });
     */
};

PoiStore.build = function(poiProvider, outputDir, options, callback) {

    if (typeof options === 'function') {
        callback = options;
        options = { };
    }

    // Set defaults
    options.maxTileLevel = options.maxTileLevel || 15;
    options.maxSimultaneousFetch = options.maxSimultaneousFetch || 10;

    var poiStore = new PoiStore({ outputDir: outputDir });

    // Clean up old data
    poiStore.destroy(function(error) {
        if (error) {
            callback(error);
            return;
        }

        var fetchError, remaining = 0;
        function addPoi() {
            if (fetchError) {
                return;
            }

            //console.log('calling next');
            poiProvider.next(function(error, poi) {
                // Only want to callback once
                if (fetchError) {
                    return;
                }

                if (error) {
                    fetchError = error;
                    callback(error);
                    return;
                }

                // no more poi to process
                if (!poi) {
                    --remaining;
                    //console.log('remaining:' + remaining);
                    if (remaining === 0) {

                        poiStore._buildLevels(poiProvider, options.maxTileLevel - 1, 1, function(error) {
                            //console.log('all done');
                            poiStore.dispose(function(error) {
                                //console.log('finished disposing');
                                callback(error);
                            });
                        });
                    }
                    return;
                }

                //TODO: How can POI have their own LOD ?
                poi.levelOfDetail = options.maxTileLevel;

                poiStore.add(poi, function(error) {
                    if (fetchError) {
                        return;
                    }

                    if (error) {
                        //TODO: Error
                    }

                    //console.log('added!');
                    process.nextTick(addPoi);
                });

                // Add the poi to the bottom most level of the map ...
                // once the bottom level has been completely generated then we move up the pyramid
            });
        }

        remaining = options.maxSimultaneousFetch;
        for (var i=0; i<options.maxSimultaneousFetch; ++i) {
            addPoi();
        }
    });
};

/**
 * @param {Object} poi
 * @param {Number} poi.latitude
 * @param {Number} poi.longitude
 * @param {Number} poi.levelOfDetail
 * @param {String} poi.id
 * @param {Function} poi.toJson if id is not specified toJson will be called
 */
PoiStore.prototype.add = function(poi, callback) {

    var pixelXY = TileSystem.latLongToPixelXY(poi.latitude, poi.longitude, poi.levelOfDetail),
        tileXY = TileSystem.pixelXYToTileXY(pixelXY.x, pixelXY.y),
        quadKey = TileSystem.tileXYToQuadKey(tileXY.x, tileXY.y, poi.levelOfDetail);

    // Now we know which tile the poi lives in, add it to the tile
    this.getTile(quadKey, function(error, tile) {
        if (error) {
            callback(error);
            return;
        }

        //TODO: Only store the id
        tile.poiIds.push(poi);
        //console.dir(tile);

        callback();
    });
    
    //console.log('lat:' + poi.latitude + ', long:' + poi.longitude + ', lod:' + poi.levelOfDetail + ', quad:' + quadKey);
    
    //poi.latitude
    //poi.longitude
    //poi.levelOfDetail
    //poi.id
    // 
    // if no id then store json
    //poi.toJson();
};

//TODO: Rename
function Tile(poiIds, path) {
    this.poiIds = poiIds;
    this.path = path;
}

Tile.load = function(dir, quadKey, callback) {
    var tilePath = Path.join(dir, quadKey + '.json');
    //console.log('tilePath: ' + tilePath);

    Fs.readFile(tilePath, function(error, data) {

        if (error && error.code !== 'ENOENT') {
            callback(error);
            return;
        }

        if (!data) {
            callback(null, new Tile([], tilePath));
            return;
        }

        //console.log('tile loaded');
        var poiIds = JSON.parse(data);
        callback(null, new Tile(poiIds, tilePath));
    });
};

Tile.prototype.dispose = function(callback) {
    console.log('disposing tile: ' + JSON.stringify(this));
    
    // don't save empty files
    if (this.poiIds.length === 0) {
        process.nextTick(callback);
        return;
    }

    
    Fs.writeFile(this.path, JSON.stringify(this.poiIds), function(error) {
        callback(error);
    });
};

PoiStore.prototype.dispose = function(callback) {
    //console.log('lrucount: ' + this._lru.count);
    this._lru.dispose(function(error) {
        callback(error);
    });
};

PoiStore.prototype.getTile = function(quadKey, callback) {

    var tile = this._lru.get(quadKey);
    if (!tile) {
        // At this point there might be multiple callers asking for the same tile
        // if it hasn't loaded we don't want to do multiple loads since they are
        // all writing data to the same instance, so we stick callers in a queue
        // until the tile has been fetched only once
        if (!this._getWaitingList[quadKey]) {
            this._getWaitingList[quadKey] = [ callback ];

            var self = this;
            Tile.load(this._outputDir, quadKey, function(error, tile) {

                function emitWaiting(error, tile) {
                    var waitingList = self._getWaitingList[quadKey];
                    for(var i=0; i<waitingList.length; ++i) {
                        waitingList[i](null, tile);
                    }
                    delete self._getWaitingList[quadKey];
                }

                if (error) {
                    emitWaiting(error);
                    return;
                }

                self._lru.set(quadKey, tile, function(error) {
                    emitWaiting(error, tile);
                });
            });

        }
        else {
            this._getWaitingList[quadKey].push(callback);
        }

        return;
    }

    process.nextTick(function() {
        callback(null, tile);
    });
};

module.exports = PoiStore;