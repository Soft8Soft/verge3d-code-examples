/**
 * @author Mugen87 / https://github.com/Mugen87
 */

(function() {

    // ConvexGeometry

    function ConvexGeometry(points) {

        v3d.Geometry.call(this);

        this.fromBufferGeometry(new ConvexBufferGeometry(points));
        this.mergeVertices();

    }

    ConvexGeometry.prototype = Object.create(v3d.Geometry.prototype);
    ConvexGeometry.prototype.constructor = ConvexGeometry;

    // ConvexBufferGeometry

    function ConvexBufferGeometry(points) {

        v3d.BufferGeometry.call(this);

        // buffers

        var vertices = [];
        var normals = [];

        // execute QuickHull

        if (v3d.QuickHull === undefined) {

            console.error('v3d.ConvexBufferGeometry: ConvexBufferGeometry relies on v3d.QuickHull');

        }

        var quickHull = new v3d.QuickHull().setFromPoints(points);

        // generate vertices and normals

        var faces = quickHull.faces;

        for (var i = 0; i < faces.length; i++) {

            var face = faces[i];
            var edge = face.edge;

            // we move along a doubly-connected edge list to access all face points (see HalfEdge docs)

            do {

                var point = edge.head().point;

                vertices.push(point.x, point.y, point.z);
                normals.push(face.normal.x, face.normal.y, face.normal.z);

                edge = edge.next;

            } while (edge !== face.edge);

        }

        // build geometry

        this.addAttribute('position', new v3d.Float32BufferAttribute(vertices, 3));
        this.addAttribute('normal', new v3d.Float32BufferAttribute(normals, 3));

    }

    ConvexBufferGeometry.prototype = Object.create(v3d.BufferGeometry.prototype);
    ConvexBufferGeometry.prototype.constructor = ConvexBufferGeometry;

    // export

    v3d.ConvexGeometry = ConvexGeometry;
    v3d.ConvexBufferGeometry = ConvexBufferGeometry;

})();
