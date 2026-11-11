// Offscreen WKWebView driver for local verification (no Chromium on this machine).
// usage: shot <index.html> <readAccessRoot> <steps.json> <outdir> [width height]
// steps: [{"js": "...", "wait": ms} | {"shot": "name.png"} (window capture) | {"snap": "name.png"} (WKWebView snapshot) | {"wait": ms}]
// Console output and errors from the page are printed to stdout as [console] lines.
import AppKit
import WebKit
let a = CommandLine.arguments
let isHTTP = a[1].hasPrefix("http"); let htmlURL = isHTTP ? URL(string: a[1])! : URL(fileURLWithPath: a[1]); let root = URL(fileURLWithPath: a[2], isDirectory: true)
let steps = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[3]))) as! [[String: Any]]
let outDir = a[4]
let W = a.count > 5 ? Double(a[5])! : 1440, H = a.count > 6 ? Double(a[6])! : 900
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
typealias CGWLCI = @convention(c) (CGRect, UInt32, UInt32, UInt32) -> Unmanaged<CGImage>?
let capWin = unsafeBitCast(dlsym(UnsafeMutableRawPointer(bitPattern: -2), "CGWindowListCreateImage"), to: CGWLCI.self)
let hook = """
(function(){const post=(k,a)=>{try{window.webkit.messageHandlers.log.postMessage(k+': '+Array.from(a).map(x=>{try{return typeof x==='string'?x:JSON.stringify(x)}catch(e){return String(x)}}).join(' '))}catch(e){}};
['log','warn','error','info'].forEach(k=>{const o=console[k];console[k]=function(){post(k,arguments);o.apply(console,arguments)}});
window.addEventListener('error',e=>post('onerror',[e.message+' @'+(e.filename||'')+':'+e.lineno]));
window.addEventListener('unhandledrejection',e=>post('reject',[String(e.reason)]));})();
"""
class D: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
  var web: WKWebView!, win: NSWindow!, i = 0
  func userContentController(_ u: WKUserContentController, didReceive m: WKScriptMessage) { print("[console] \(m.body)") }
  func start() {
    let cfg = WKWebViewConfiguration()
    cfg.websiteDataStore = .nonPersistent()
    if #available(macOS 14.0, *) { cfg.preferences.inactiveSchedulingPolicy = .none }
    cfg.mediaTypesRequiringUserActionForPlayback = []
    cfg.userContentController.add(self, name: "log")
    cfg.userContentController.addUserScript(WKUserScript(source: hook, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: cfg)
    web.navigationDelegate = self
    let occl = NSSelectorFromString("_setWindowOcclusionDetectionEnabled:")
    if web.responds(to: occl) { _ = web.perform(occl, with: NSNumber(value: false)) }
    win = NSWindow(contentRect: NSRect(x: -4000, y: 0, width: W, height: H), styleMask: [.borderless], backing: .buffered, defer: false)
    win.contentView = web; win.orderFrontRegardless()
    if isHTTP { web.load(URLRequest(url: htmlURL)) } else { web.loadFileURL(htmlURL, allowingReadAccessTo: root) }
  }
  func webView(_ w: WKWebView, didFinish n: WKNavigation!) { after(800) { self.next() } }
  func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { print("navfail \(e)"); exit(2) }
  func after(_ ms: Double, _ f: @escaping () -> Void) { DispatchQueue.main.asyncAfter(deadline: .now() + ms / 1000, execute: f) }
  func next() {
    guard i < steps.count else { print("done"); exit(0) }
    let s = steps[i]; i += 1
    if let js = s["js"] as? String {
      web.callAsyncJavaScript(js, arguments: [:], in: nil, in: .page) { r in
        switch r { case .failure(let e): print("[js error] step \(self.i - 1): \(e)")
        case .success(let v): if !(v is NSNull) { print("[js] \(v)") } }
        self.after((s["wait"] as? Double) ?? 0) { self.next() }
      }
    } else if let p = s["shot"] as? String {
      if let cg = capWin(.null, 8, UInt32(win.windowNumber), 1 | 8)?.takeRetainedValue(),
         let d = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) {
        try? d.write(to: URL(fileURLWithPath: outDir + "/" + p)); print("shot \(p) \(cg.width)x\(cg.height)")
      } else { print("shot failed \(p)") }
      after((s["wait"] as? Double) ?? 0) { self.next() }
    } else if let p = s["snap"] as? String {
      // WKWebView's own snapshot (renders filters; does not include <video>/WebGL layers on all systems)
      let c = WKSnapshotConfiguration()
      web.takeSnapshot(with: c) { img, err in
        if let img = img, let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil),
           let d = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) {
          try? d.write(to: URL(fileURLWithPath: outDir + "/" + p)); print("snap \(p) \(cg.width)x\(cg.height)")
        } else { print("snap failed \(p) \(String(describing: err))") }
        self.after((s["wait"] as? Double) ?? 0) { self.next() }
      }
    } else { after((s["wait"] as? Double) ?? 0) { self.next() } }
  }
}
setbuf(stdout, nil)
let activity = ProcessInfo.processInfo.beginActivity(options: [.userInitiated, .latencyCritical], reason: "shots")
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let d = D(); d.start()
DispatchQueue.main.asyncAfter(deadline: .now() + 300) { print("timeout"); exit(1) }
app.run()
