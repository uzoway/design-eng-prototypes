import AppKit
_ = NSApplication.shared
func dump(_ c: NSCursor, _ name: String, px: CGFloat) {
  let img = c.image; let size = img.size
  let w = Int(size.width * px), h = Int(size.height * px)
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  rep.size = size
  NSGraphicsContext.saveGraphicsState()
  let ctx = NSGraphicsContext(bitmapImageRep: rep)!
  ctx.imageInterpolation = .high
  NSGraphicsContext.current = ctx
  img.draw(in: NSRect(origin: .zero, size: size), from: .zero, operation: .copy, fraction: 1, respectFlipped: true, hints: [.interpolation: NSNumber(value: NSImageInterpolation.high.rawValue)])
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(name).png"))
  print("\(name) pt=\(size.width)x\(size.height) hot=\(c.hotSpot.x),\(c.hotSpot.y) reps=\(img.representations.map{"\($0.pixelsWide)x\($0.pixelsHigh)"})")
}
dump(NSCursor.arrow, "arrow", px: 10)
dump(NSCursor.pointingHand, "pointinghand", px: 10)
dump(NSCursor.iBeam, "ibeam", px: 10)
