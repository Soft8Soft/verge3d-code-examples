import {

    // core

    Node,
    TempNode,
    InputNode,
    ConstNode,
    VarNode,
    StructNode,
    AttributeNode,
    FunctionNode,
    ExpressionNode,
    FunctionCallNode,
    NodeLib,
    NodeUtils,
    NodeFrame,
    NodeUniform,
    NodeBuilder,

    // inputs

    IntNode,
    FloatNode,
    Vector2Node,
    Vector3Node,
    Vector4Node,
    ColorNode,
    Matrix3Node,
    Matrix4Node,
    TextureNode,
    CubeTextureNode,
    ScreenNode,
    ReflectorNode,
    PropertyNode,
    RTTNode,

    // accessors

    UVNode,
    ColorsNode,
    PositionNode,
    NormalNode,
    CameraNode,
    LightNode,
    ReflectNode,
    ScreenUVNode,
    ResolutionNode,

    // math

    Math1Node,
    Math2Node,
    Math3Node,
    OperatorNode,
    CondNode,

    // procedural

    NoiseNode,
    CheckerNode,

    // bsdfs

    BlinnShininessExponentNode,
    BlinnExponentToRoughnessNode,
    RoughnessToBlinnExponentNode,

    // misc

    TextureCubeUVNode,
    TextureCubeNode,
    NormalMapNode,
    BumpMapNode,

    // utils

    BypassNode,
    JoinNode,
    SwitchNode,
    TimerNode,
    VelocityNode,
    UVTransformNode,
    MaxMIPLevelNode,
    ColorSpaceNode,

    // effects

    BlurNode,
    ColorAdjustmentNode,
    LuminanceNode,

    // material nodes

    RawNode,
    SpriteNode,
    PhongNode,
    StandardNode,
    MeshStandardNode,

    // materials

    NodeMaterial,
    SpriteNodeMaterial,
    PhongNodeMaterial,
    StandardNodeMaterial,
    MeshStandardNodeMaterial,

    // post-processing

    NodePostProcessing

} from './Nodes.js';

// core

v3d.Node = Node;
v3d.TempNode = TempNode;
v3d.InputNode = InputNode;
v3d.ConstNode = ConstNode;
v3d.VarNode = VarNode;
v3d.StructNode = StructNode;
v3d.AttributeNode = AttributeNode;
v3d.FunctionNode = FunctionNode;
v3d.ExpressionNode = ExpressionNode;
v3d.FunctionCallNode = FunctionCallNode;
v3d.NodeLib = NodeLib;
v3d.NodeUtils = NodeUtils;
v3d.NodeFrame = NodeFrame;
v3d.NodeUniform = NodeUniform;
v3d.NodeBuilder = NodeBuilder;

// inputs

v3d.IntNode = IntNode;
v3d.FloatNode = FloatNode;
v3d.Vector2Node = Vector2Node;
v3d.Vector3Node = Vector3Node;
v3d.Vector4Node = Vector4Node;
v3d.ColorNode = ColorNode;
v3d.Matrix3Node = Matrix3Node;
v3d.Matrix4Node = Matrix4Node;
v3d.TextureNode = TextureNode;
v3d.CubeTextureNode = CubeTextureNode;
v3d.ScreenNode = ScreenNode;
v3d.ReflectorNode = ReflectorNode;
v3d.PropertyNode = PropertyNode;
v3d.RTTNode = RTTNode;

// accessors

v3d.UVNode = UVNode;
v3d.ColorsNode = ColorsNode;
v3d.PositionNode = PositionNode;
v3d.NormalNode = NormalNode;
v3d.CameraNode = CameraNode;
v3d.LightNode = LightNode;
v3d.ReflectNode = ReflectNode;
v3d.ScreenUVNode = ScreenUVNode;
v3d.ResolutionNode = ResolutionNode;

// math

v3d.Math1Node = Math1Node;
v3d.Math2Node = Math2Node;
v3d.Math3Node = Math3Node;
v3d.OperatorNode = OperatorNode;
v3d.CondNode = CondNode;

// procedural

v3d.NoiseNode = NoiseNode;
v3d.CheckerNode = CheckerNode;

// bsdfs

v3d.BlinnShininessExponentNode = BlinnShininessExponentNode;
v3d.BlinnExponentToRoughnessNode = BlinnExponentToRoughnessNode;
v3d.RoughnessToBlinnExponentNode = RoughnessToBlinnExponentNode;

// misc

v3d.TextureCubeUVNode = TextureCubeUVNode;
v3d.TextureCubeNode = TextureCubeNode;
v3d.NormalMapNode = NormalMapNode;
v3d.BumpMapNode = BumpMapNode;

// utils

v3d.BypassNode = BypassNode;
v3d.JoinNode = JoinNode;
v3d.SwitchNode = SwitchNode;
v3d.TimerNode = TimerNode;
v3d.VelocityNode = VelocityNode;
v3d.UVTransformNode = UVTransformNode;
v3d.MaxMIPLevelNode = MaxMIPLevelNode;
v3d.ColorSpaceNode = ColorSpaceNode;

// effects

v3d.BlurNode = BlurNode;
v3d.ColorAdjustmentNode = ColorAdjustmentNode;
v3d.LuminanceNode = LuminanceNode;

// material nodes

v3d.RawNode = RawNode;
v3d.SpriteNode = SpriteNode;
v3d.PhongNode = PhongNode;
v3d.StandardNode = StandardNode;
v3d.MeshStandardNode = MeshStandardNode;

// materials

v3d.NodeMaterial = NodeMaterial;
v3d.SpriteNodeMaterial = SpriteNodeMaterial;
v3d.PhongNodeMaterial = PhongNodeMaterial;
v3d.StandardNodeMaterial = StandardNodeMaterial;
v3d.MeshStandardNodeMaterial = MeshStandardNodeMaterial;

// post-processing

v3d.NodePostProcessing = NodePostProcessing;
