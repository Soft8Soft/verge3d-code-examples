v3d.Line2 = function(geometry, material) {

    if (geometry === undefined) geometry = new v3d.LineGeometry();
    if (material === undefined) material = new v3d.LineMaterial({ color: Math.random() * 0xffffff });

    v3d.LineSegments2.call(this, geometry, material);

    this.type = 'Line2';

};

v3d.Line2.prototype = Object.assign(Object.create(v3d.LineSegments2.prototype), {

    constructor: v3d.Line2,

    isLine2: true

});
