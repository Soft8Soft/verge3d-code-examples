/**
 * @author renej
 * NURBS curve object
 *
 * Derives from Curve, overriding getPoint and getTangent.
 *
 * Implementation is based on (x, y [, z=0 [, w=1]]) control points with w=weight.
 *
 **/


/**************************************************************
 *    NURBS curve
 **************************************************************/

v3d.NURBSCurve = function(degree, knots /* array of reals */, controlPoints /* array of Vector(2|3|4) */, startKnot /* index in knots */, endKnot /* index in knots */) {

    v3d.Curve.call(this);

    this.degree = degree;
    this.knots = knots;
    this.controlPoints = [];
    // Used by periodic NURBS to remove hidden spans
    this.startKnot = startKnot || 0;
    this.endKnot = endKnot || (this.knots.length - 1);
    for (var i = 0; i < controlPoints.length; ++ i) {

        // ensure Vector4 for control points
        var point = controlPoints[i];
        this.controlPoints[i] = new v3d.Vector4(point.x, point.y, point.z, point.w);

    }

};


v3d.NURBSCurve.prototype = Object.create(v3d.Curve.prototype);
v3d.NURBSCurve.prototype.constructor = v3d.NURBSCurve;


v3d.NURBSCurve.prototype.getPoint = function(t) {

    var u = this.knots[this.startKnot] + t * (this.knots[this.endKnot] - this.knots[this.startKnot]); // linear mapping t->u

    // following results in (wx, wy, wz, w) homogeneous point
    var hpoint = v3d.NURBSUtils.calcBSplinePoint(this.degree, this.knots, this.controlPoints, u);

    if (hpoint.w != 1.0) {

        // project to 3D space: (wx, wy, wz, w) -> (x, y, z, 1)
        hpoint.divideScalar(hpoint.w);

    }

    return new v3d.Vector3(hpoint.x, hpoint.y, hpoint.z);

};


v3d.NURBSCurve.prototype.getTangent = function(t) {

    var u = this.knots[0] + t * (this.knots[this.knots.length - 1] - this.knots[0]);
    var ders = v3d.NURBSUtils.calcNURBSDerivatives(this.degree, this.knots, this.controlPoints, u, 1);
    var tangent = ders[1].clone();
    tangent.normalize();

    return tangent;

};
