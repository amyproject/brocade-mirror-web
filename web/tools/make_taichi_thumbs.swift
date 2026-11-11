// Renders 3:4 thumbnails of the Tai Chi avatar into web/content/taichi/thumbs.
// Run from baduanjin_app/: swiftc -O web/tools/make_taichi_thumbs.swift -o /tmp/tc_thumbs && /tmp/tc_thumbs
import AVFoundation
import AppKit

let slugs = ["01-commencing", "02-repulse-monkey", "03-brush-knee", "04-wild-horse", "05-wave-hands",
             "06-golden-rooster", "07-heel-kick", "08-grasp-the-birds-tail"]
let outfits: [(key: String, dir: String, times: [Double])] = [
    ("red", "taichi-red-uniform", [3.5, 8.5, 3.5, 4.5, 2.5, 4.5, 3.5, 6.5]),
    ("qipao", "taichi-qipao", [3.5, 5.5, 3.5, 3.5, 2.5, 3.5, 2.5, 6.5]),
]
let out = "web/content/taichi/thumbs"
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)

for o in outfits {
    for (i, slug) in slugs.enumerated() {
        let url = URL(fileURLWithPath: "../me_video/\(o.dir)/moves/\(slug)/front.mp4")
        let gen = AVAssetImageGenerator(asset: AVURLAsset(url: url))
        gen.appliesPreferredTrackTransform = true
        gen.requestedTimeToleranceBefore = .zero
        gen.requestedTimeToleranceAfter = .zero
        let img = try! gen.copyCGImage(at: CMTime(seconds: o.times[i], preferredTimescale: 600), actualTime: nil)
        // Fit the whole frame into 480x640, padding with the studio colour so nothing is cropped.
        let W = 480, H = 640
        let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        ctx.setFillColor((NSBitmapImageRep(cgImage: img).colorAt(x: 4, y: 4) ?? .white).cgColor)
        ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
        ctx.interpolationQuality = .high
        let s = max(CGFloat(H) / CGFloat(img.height), min(CGFloat(W) / CGFloat(img.width) * 1.25, CGFloat(H) / CGFloat(img.height)))
        let dw = CGFloat(img.width) * s, dh = CGFloat(img.height) * s
        ctx.draw(img, in: CGRect(x: (CGFloat(W) - dw) / 2, y: (CGFloat(H) - dh) / 2, width: dw, height: dh))
        try! NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using: .jpeg, properties: [.compressionFactor: 0.82])!
            .write(to: URL(fileURLWithPath: "\(out)/thumb_\(o.key)_\(i + 1).jpg"))
    }
}
print("ok")
