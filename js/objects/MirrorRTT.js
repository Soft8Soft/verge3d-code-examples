v3d.MirrorRTT = function(width, height, options) {

    v3d.Mirror.call(this, width, height, options);

    this.geometry.setDrawRange(0, 0); // avoid rendering geometry

};

v3d.MirrorRTT.prototype = Object.create(v3d.Mirror.prototype);
