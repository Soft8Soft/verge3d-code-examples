(function() {

    /**
 * NURBS curve object
 *
 * Derives from v3d.Curve, overriding getPoint and getTangent.
 *
 * Implementation is based on (x, y [, z=0 [, w=1]]) control points with w=weight.
 *
 **/

    class NURBSCurve extends v3d.Curve {

        constructor(degree, knots
            /* array of reals */
            , controlPoints
            /* array of Vector(2|3|4) */
            , startKnot
            /* index in knots */
            , endKnot
            /* index in knots */
        ) {

            super();
            this.degree = degree;
            this.knots = knots;
            this.controlPoints = []; // Used by periodic NURBS to remove hidden spans

            this.startKnot = startKnot || 0;
            this.endKnot = endKnot || this.knots.length - 1;

            for (let i = 0; i < controlPoints.length; ++ i) {

                // ensure v3d.Vector4 for control points
                const point = controlPoints[i];
                this.controlPoints[i] = new v3d.Vector4(point.x, point.y, point.z, point.w);

            }

        }

        getPoint(t, optionalTarget = new v3d.Vector3()) {

            const point = optionalTarget;
            const u = this.knots[this.startKnot] + t * (this.knots[this.endKnot] - this.knots[this.startKnot]); // linear mapping t->u
            // following results in (wx, wy, wz, w) homogeneous point

            const hpoint = v3d.NURBSUtils.calcBSplinePoint(this.degree, this.knots, this.controlPoints, u);

            if (hpoint.w !== 1.0) {

                // project to 3D space: (wx, wy, wz, w) -> (x, y, z, 1)
                hpoint.divideScalar(hpoint.w);

            }

            return point.set(hpoint.x, hpoint.y, hpoint.z);

        }

        getTangent(t, optionalTarget = new v3d.Vector3()) {

            const tangent = optionalTarget;
            const u = this.knots[0] + t * (this.knots[this.knots.length - 1] - this.knots[0]);
            const ders = v3d.NURBSUtils.calcNURBSDerivatives(this.degree, this.knots, this.controlPoints, u, 1);
            tangent.copy(ders[1]).normalize();
            return tangent;

        }

    }

    v3d.NURBSCurve = NURBSCurve;

})();
