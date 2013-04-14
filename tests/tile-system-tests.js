var should = require('should'),
    TileSystem = require('../').TileSystem;
    
describe('TileSystem', function() {
    it('clip contains range', function(done) {
        TileSystem.clip(10, 15, 100).should.equal(15);
        TileSystem.clip(10, 1, 8).should.equal(8);
        done();
    });

    it('size at lod is correct', function(done) {
        TileSystem.sizeAtLod(1).should.equal(512);
        TileSystem.sizeAtLod(2).should.equal(1024);
        done();
    });

    it('tileXYToQuadKey', function(done) {
        TileSystem.tileXYToQuadKey(3, 5, 3).should.equal('213');
        done();
    });

    it('quadKeyToTileXY', function(done) {
        var tileXY = TileSystem.quadKeyToTileXY('213');
        tileXY.x.should.equal(3);
        tileXY.y.should.equal(5);
        tileXY.levelOfDetail.should.equal(3);
        done();
    });
});

