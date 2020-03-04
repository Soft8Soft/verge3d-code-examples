/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

v3d.WireframeGeometry2 = function(geometry) {

    v3d.LineSegmentsGeometry.call(this);

    this.type = 'WireframeGeometry2';

    this.fromWireframeGeometry(new v3d.WireframeGeometry(geometry));

    // set colors, maybe

};

v3d.WireframeGeometry2.prototype = Object.assign(Object.create(v3d.LineSegmentsGeometry.prototype), {

    constructor: v3d.WireframeGeometry2,

    isWireframeGeometry2: true

});
