/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

v3d.Line2 = function(geometry, material) {

    v3d.LineSegments2.call(this);

    this.type = 'Line2';

    this.geometry = geometry !== undefined ? geometry : new v3d.LineGeometry();
    this.material = material !== undefined ? material : new v3d.LineMaterial({ color: Math.random() * 0xffffff });

};

v3d.Line2.prototype = Object.assign(Object.create(v3d.LineSegments2.prototype), {

    constructor: v3d.Line2,

    isLine2: true

});
