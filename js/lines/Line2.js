(function() {

    class Line2 extends v3d.LineSegments2 {

        constructor(geometry = new v3d.LineGeometry(), material = new v3d.LineMaterial({
            color: Math.random() * 0xffffff
        })) {

            super(geometry, material);
            this.type = 'Line2';

        }

    }

    Line2.prototype.isLine2 = true;

    v3d.Line2 = Line2;

})();
