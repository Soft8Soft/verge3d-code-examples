/**
 * RTT version
 */

v3d.ReflectorRTT = function(geometry, options) {

    v3d.Reflector.call(this, geometry, options);

    this.geometry.setDrawRange(0, 0); // avoid rendering geometry

};

v3d.ReflectorRTT.prototype = Object.create(v3d.Reflector.prototype);
