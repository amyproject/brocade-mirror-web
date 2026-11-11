// Cut-out avatar figures for the main-page avatar picker (web/content/avatars/*.png).
// Each figure is one video frame with the studio removed by Vision person segmentation,
// cropped to the person and scaled to 400 px tall.
// Run from baduanjin_app/: swiftc -O web/tools/make_avatars.swift -o /tmp/avatars && /tmp/avatars
import AVFoundation
import AppKit
import CoreImage
import Vision

let jobs: [(video: String, time: Double, out: String)] = [
    ("assets/red-form1.mp4", 6.5, "bdj_traditional"),
    ("assets/gym-form1.mp4", 6.0, "bdj_modern"),
    ("../me_video/taichi-red-uniform/moves/01-commencing/front.mp4", 4.0, "taichi_red"),
    ("../me_video/taichi-qipao/moves/01-commencing/front.mp4", 4.0, "taichi_qipao"),
    ("../me_video/v2/baduanjin-uniform/moves/01-two-hands-hold-up-the-heavens/front.mp4", 6.3, "v2_uniform"),
    ("../me_video/baduanjin-qipao 2/moves/01-two-hands-hold-up-the-heavens/front.mp4", 4.0, "v2_qipao"),
]
let outDir = "web/content/avatars"
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let ci = CIContext()

for job in jobs {
    let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: job.video)))
    gen.appliesPreferredTrackTransform = true
    gen.requestedTimeToleranceBefore = .zero
    gen.requestedTimeToleranceAfter = .zero
    let frame = try! gen.copyCGImage(at: CMTime(seconds: job.time, preferredTimescale: 600), actualTime: nil)

    let req = VNGeneratePersonSegmentationRequest()
    req.qualityLevel = .accurate
    req.outputPixelFormat = kCVPixelFormatType_OneComponent8
    try! VNImageRequestHandler(cgImage: frame).perform([req])
    let maskBuf = req.results!.first!.pixelBuffer

    let img = CIImage(cgImage: frame)
    var mask = CIImage(cvPixelBuffer: maskBuf)
    mask = mask.transformed(by: CGAffineTransform(scaleX: img.extent.width / mask.extent.width, y: img.extent.height / mask.extent.height))
    let cut = img.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: CIImage.empty(), kCIInputMaskImageKey: mask])

    // Bounding box of the person from the mask (rows/cols above a threshold).
    let mw = CVPixelBufferGetWidth(maskBuf), mh = CVPixelBufferGetHeight(maskBuf)
    CVPixelBufferLockBaseAddress(maskBuf, .readOnly)
    let base = CVPixelBufferGetBaseAddress(maskBuf)!.assumingMemoryBound(to: UInt8.self), stride = CVPixelBufferGetBytesPerRow(maskBuf)
    var x0 = mw, x1 = 0, y0 = mh, y1 = 0
    for y in 0..<mh { for x in 0..<mw where base[y * stride + x] > 128 { x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y) } }
    CVPixelBufferUnlockBaseAddress(maskBuf, .readOnly)
    let sx = img.extent.width / CGFloat(mw), sy = img.extent.height / CGFloat(mh), pad: CGFloat = 6
    // mask rows run top-down; CoreImage y runs bottom-up
    let box = CGRect(x: CGFloat(x0) * sx - pad, y: img.extent.height - CGFloat(y1 + 1) * sy - pad,
                     width: CGFloat(x1 - x0 + 1) * sx + 2 * pad, height: CGFloat(y1 - y0 + 1) * sy + 2 * pad).intersection(img.extent)

    let scale = 400 / box.height
    let out = cut.cropped(to: box).transformed(by: CGAffineTransform(translationX: -box.minX, y: -box.minY).scaledBy(x: 1, y: 1))
        .transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let cg = ci.createCGImage(out, from: CGRect(x: 0, y: 0, width: (box.width * scale).rounded(), height: 400), format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())!
    let url = URL(fileURLWithPath: "\(outDir)/\(job.out).png")
    try! NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!.write(to: url)
    print(job.out, cg.width, "x", cg.height)
}
