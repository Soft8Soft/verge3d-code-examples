/**
 * @author Mugen87 / https://github.com/Mugen87
 */

// ConvexGeometry

v3d.ConvexGeometry = function(points) {

    v3d.Geometry.call(this);

    this.fromBufferGeometry(new v3d.ConvexBufferGeometry(points));
    this.mergeVertices();

};

v3d.ConvexGeometry.prototype = Object.create(v3d.Geometry.prototype);
v3d.ConvexGeometry.prototype.constructor = v3d.ConvexGeometry;

// ConvexBufferGeometry

v3d.ConvexBufferGeometry = function(points) {

    v3d.BufferGeometry.call(this);

    // buffers

    var vertices = [];
    var normals = [];

    if (v3d.ConvexHull === undefined) {

        console.error('v3d.ConvexBufferGeometry: ConvexBufferGeometry relies on v3d.ConvexHull');

    }

    var convexHull = new v3d.ConvexHull().setFromPoints(points);

    // generate vertices and normals

    var faces = convexHull.faces;

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

    this.setAttribute('position', new v3d.Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new v3d.Float32BufferAttribute(normals, 3));

};

v3d.ConvexBufferGeometry.prototype = Object.create(v3d.BufferGeometry.prototype);
v3d.ConvexBufferGeometry.prototype.constructor = v3d.ConvexBufferGeometry;
