(function() {

    class WireframeGeometry2 extends v3d.LineSegmentsGeometry {

        constructor(geometry) {

            super();
            this.type = 'WireframeGeometry2';
            this.fromWireframeGeometry(new v3d.WireframeGeometry(geometry)); // set colors, maybe

        }

    }

    WireframeGeometry2.prototype.isWireframeGeometry2 = true;

    v3d.WireframeGeometry2 = WireframeGeometry2;

})();
