// Media for the v2 Baduanjin site (web/baduanjin-v2.html), from taichi/me_video:
//   web/content/v2/thumbs/thumb_{uniform,qipao}_{1..8}.jpg         3:4 move thumbnails (front clips)
//   web/content/v2/full-{uniform,qipao}-{front,left,right,back}.mp4  each angle's 8 clips joined into one routine
// Uniform clips come from me_video/v2/baduanjin-uniform, qipao from me_video/baduanjin-qipao 2.
// Run from baduanjin_app/: swiftc -O -swift-version 5 web/tools/make_v2_media.swift -o /tmp/v2_media && /tmp/v2_media [thumbs|full]
import AVFoundation
import AppKit
import CoreImage

let slugs = ["01-two-hands-hold-up-the-heavens", "02-drawing-the-bow", "03-single-arm-lift", "04-looking-backward",
             "05-swaying-head-and-tail", "06-two-hands-hold-the-feet", "07-clenching-fists-and-glaring", "08-bouncing-on-the-toes"]
let outfits: [(key: String, dir: String, times: [Double])] = [
    ("uniform", "v2/baduanjin-uniform/moves", [5, 4, 2, 3, 5, 5, 2, 3.5]),
    ("qipao", "baduanjin-qipao 2/moves", [4, 4, 3, 3, 2.5, 5, 4.5, 3]),
]
let angles = ["front", "left", "right", "back"]
let out = "web/content/v2"
let only = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "all"
try? FileManager.default.createDirectory(atPath: out + "/thumbs", withIntermediateDirectories: true)
func clip(_ o: (key: String, dir: String, times: [Double]), _ i: Int, _ angle: String = "front") -> URL {
    URL(fileURLWithPath: "../me_video/\(o.dir)/\(slugs[i])/\(angle).mp4")
}

// Thumbnails: fit the whole frame into 480x640, padding with the studio colour so nothing is cropped.
if only != "full" {
    for o in outfits {
        for i in slugs.indices {
            let gen = AVAssetImageGenerator(asset: AVURLAsset(url: clip(o, i)))
            gen.appliesPreferredTrackTransform = true
            gen.requestedTimeToleranceBefore = .zero
            gen.requestedTimeToleranceAfter = .zero
            let img = try! gen.copyCGImage(at: CMTime(seconds: o.times[i], preferredTimescale: 600), actualTime: nil)
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
                .write(to: URL(fileURLWithPath: "\(out)/thumbs/thumb_\(o.key)_\(i + 1).jpg"))
        }
    }
    print("wrote thumbnails")
}

// Full routines: one per outfit and angle, the 8 clips back to back at 944x960 (the common clip size).
// Clips of another shape (768x1040, 720x1280) are scaled to the full height and centred, so the person is
// never cropped. The side bands are a still backdrop: a column 10 px in from each edge of the clip's first
// frame (when nobody is near the edge), blurred and stretched sideways. The clip's own outer 4 px are
// trimmed, because some clips have a darker rim. Still bands keep the backdrop plain for the background key.
let W = 944, H = 960
let ci = CIContext(options: [.workingColorSpace: NSNull()])
func encode(_ o: (key: String, dir: String, times: [Double]), _ angle: String) {
    let dest = URL(fileURLWithPath: "\(out)/full-\(o.key)-\(angle).mp4")
    try? FileManager.default.removeItem(at: dest)
    let writer = try! AVAssetWriter(outputURL: dest, fileType: .mp4)
    let win = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
        AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_500_000, AVVideoMaxKeyFrameIntervalKey: 24,
                                          AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
    win.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: win, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
    writer.add(win)
    writer.shouldOptimizeForNetworkUse = true
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)
    var offset = CMTime.zero, sizes: [String] = []
    for i in slugs.indices {
        let asset = AVURLAsset(url: clip(o, i, angle))
        let track = asset.tracks(withMediaType: .video)[0]
        let reader = try! AVAssetReader(asset: asset)
        let rout = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
        reader.add(rout)
        reader.startReading()
        let dur = asset.duration
        var bands: CIImage?
        while let sb = rout.copyNextSampleBuffer() {
            guard let px = CMSampleBufferGetImageBuffer(sb) else { continue }
            let pts = CMSampleBufferGetPresentationTimeStamp(sb)
            if CMTimeCompare(pts, dur) >= 0 { continue }
            var img = CIImage(cvPixelBuffer: px)
            let w = img.extent.width, h = img.extent.height
            if Int(w) != W || Int(h) != H {
                let s = CGFloat(H) / h, sw = w * s, x0 = (CGFloat(W) - sw) / 2
                let placed = img.transformed(by: CGAffineTransform(scaleX: s, y: s).concatenating(CGAffineTransform(translationX: x0, y: 0)))
                if bands == nil {
                    func band(_ x: CGFloat, _ rect: CGRect) -> CIImage {
                        // whole-pixel column (a half-pixel crop would come out half transparent)
                        placed.cropped(to: CGRect(x: x.rounded(.down), y: 0, width: 1, height: CGFloat(H))).clampedToExtent()
                            .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 3])
                            .settingAlphaOne(in: rect).cropped(to: rect)
                    }
                    let half = CGFloat(W) / 2
                    bands = band(x0 + 10, CGRect(x: 0, y: 0, width: half, height: CGFloat(H)))
                        .composited(over: band(x0 + sw - 11, CGRect(x: half, y: 0, width: half, height: CGFloat(H))))
                    // render once so every frame reuses the same pixels
                    let cg = ci.createCGImage(bands!, from: CGRect(x: 0, y: 0, width: W, height: H))!
                    bands = CIImage(cgImage: cg)
                }
                img = placed.cropped(to: CGRect(x: x0 + 4, y: 0, width: sw - 8, height: CGFloat(H)))
                    .composited(over: bands!)
                    .cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
            }
            var outPx: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &outPx)
            ci.render(img, to: outPx!)
            while !win.isReadyForMoreMediaData { usleep(2000) }
            adaptor.append(outPx!, withPresentationTime: offset + pts)
        }
        precondition(reader.status == .completed, "read failed \(clip(o, i, angle).path): \(String(describing: reader.error))")
        sizes.append("\(Int(track.naturalSize.width))x\(Int(track.naturalSize.height))")
        offset = offset + dur
    }
    win.markAsFinished()
    let sem = DispatchSemaphore(value: 0)
    writer.finishWriting { sem.signal() }
    sem.wait()
    precondition(writer.status == .completed, "write failed: \(String(describing: writer.error))")
    print("wrote", dest.lastPathComponent, String(format: "%.2f s", offset.seconds), sizes.joined(separator: " "))
}
if only != "thumbs" {
    for o in outfits { for a in angles { encode(o, a) } }
}
