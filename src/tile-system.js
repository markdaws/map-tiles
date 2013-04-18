// See this doc for more information: http://msdn.microsoft.com/en-us/library/bb259689.aspx

function TileSystem() {
}
TileSystem.EarthRadius = 6378137;
TileSystem.MinLatitude = -85.05112878;
TileSystem.MaxLatitude = 85.05112878;
TileSystem.MinLongitude = -180;
TileSystem.MaxLongitude = 180;
TileSystem.MinTileSize = 256;

/**
 * Clips the input number ot the specified mix/max values
 * 
 * @param {Number} n the number to clip
 * @param {Number} min The minimum allowed value
 * @param {Number} max The maximum allowed value
 */
TileSystem.clip = function(n, min, max) {
    return Math.min(Math.max(n, min), max);
};

/**
 * Give a level of detail returns the dimension of the region in pixels, lod 1 
 * maps to 512x512 pixels
 */
TileSystem.sizeAtLod = function(levelOfDetail) {
    return TileSystem.MinTileSize << levelOfDetail;
};

/**
 * Converts a lat/long/LOD value to a pixel XY coordinate at the LOD
 * 
 * @param {Number} latitude latitude of a point in degrees
 * @param {Number} longitude longitude of a point in degrees
 * @param {Number} levelOfDetail value from 1 (lowest) to 23 (highest)
 */
TileSystem.latLongToPixelXY = function(latitude, longitude, levelOfDetail) {
    latitude = TileSystem.clip(latitude, TileSystem.MinLatitude, TileSystem.MaxLatitude);
    longitude = TileSystem.clip(longitude, TileSystem.MinLongitude, TileSystem.MaxLongitude);

    var x = (longitude + 180) / 360; 
    var sinLatitude = Math.sin(latitude * Math.PI / 180);
    var y = 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);
    
    var mapSize = TileSystem.sizeAtLod(levelOfDetail);
    return {
        x: Math.floor(TileSystem.clip(x * mapSize + 0.5, 0, mapSize - 1)),
        y: Math.floor(TileSystem.clip(y * mapSize + 0.5, 0, mapSize - 1))
    };
};

/**
 * Given a pixel x/y value at a particular level of detail 
 * return the corresponding latitude / longitude
 */
TileSystem.pixelXYToLatLong = function(pixelX, pixelY, levelOfDetail) {

    var mapSize = TileSystem.sizeAtLod(levelOfDetail);
    var x = (TileSystem.clip(pixelX, 0, mapSize - 1) / mapSize) - 0.5;
    var y = 0.5 - (TileSystem.clip(pixelY, 0, mapSize - 1) / mapSize);
    
    return {
        latitude: 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI,
        longitude: 360 * x
    };
};

//highest lod ?
TileSystem.pixelXYToTileXY = function(pixelX, pixelY) {
    return {
        x: Math.floor(pixelX / TileSystem.MinTileSize),
        y: Math.floor(pixelY / TileSystem.MinTileSize)
    };
};

TileSystem.tileXYToPixelXY = function(tileX, tileY) {
    return {
        x: tileX * TileSystem.MinTileSize,
        y: tileY * TileSystem.MinTileSize
    };
};

TileSystem.latLongToQuadKey = function(latitude, longitude, levelOfDetail) {
    var pixelXY = TileSystem.latLongToPixelXY(latitude, longitude, levelOfDetail);
    var tileXY = TileSystem.pixelXYToTileXY(pixelXY.x, pixelXY.y);
    return TileSystem.tileXYToQuadKey(tileXY.x, tileXY.y, levelOfDetail);
};

TileSystem.quadKeyToLatLong = function(quadkey) {
    var tileXY = TileSystem.quadKeyToTileXY(quadkey),
        pixelXY = TileSystem.tileXYToPixelXY(tileXY.x, tileXY.y),
        latLong = TileSystem.pixelXYToLatLong(pixelXY.x, pixelXY.y, tileXY.levelOfDetail);
    return {
        latitude: latLong.latitude,
        longitude: latLong.longitude,
        levelOfDetail: tileXY.levelOfDetail
    };
};

TileSystem.tileXYToQuadKey = function(tileX, tileY, levelOfDetail) {
    var quadKey = '';
    for (var i = levelOfDetail; i > 0; i--) {
        var digit = 0;
        var mask = 1 << (i - 1);

        if ((tileX & mask)) {
            digit++;
        }
        if ((tileY & mask)){
            digit++;
            digit++;
        }
        quadKey += digit;
    }
    return quadKey;
};

TileSystem.quadKeyToTileXY = function(quadKey) {
    var tileX = 0, tileY = 0, levelOfDetail = quadKey.length;

    for (var i = levelOfDetail; i > 0; i--) {
        var mask = 1 << (i - 1);
        switch (quadKey[levelOfDetail - i]) {
        case '0':
            break;
            
        case '1':
            tileX |= mask;
            break;
            
        case '2':
            tileY |= mask;
            break;
            
        case '3':
            tileX |= mask;
            tileY |= mask;
            break;
            
        default:
            return null;
        }
    }
    
    return {
        x: tileX,
        y: tileY,
        levelOfDetail: levelOfDetail
    };
};

TileSystem.maxTileIndexAtLod = function(levelOfDetail) {
    return Math.pow(2, levelOfDetail) - 1;
};

//TODO: Some other file ...

//function TileStore
//TileSystem.queryBoundingRegion = function(minLat, minLong, maxLat, maxLong, levelOfDetail) {
    
//};

module.exports = TileSystem;


//TODO:
// 1. Set of photos, generate tiles with this information in them
// 2. Given a bounding region, find all of the tiles you should search