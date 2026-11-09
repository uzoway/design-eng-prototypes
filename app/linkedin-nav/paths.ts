/*
 * LinkedIn's shipped nav icons (Nov 2026), copied path for path from
 * briefs/refs/linkedin-nav/icons. Each is a 24 × 24 filled shape whose
 * "lines" are 1.5px contours, drawn in currentColor.
 *
 * The animated icons split these paths into parts with clip regions whose
 * edges sit on whole units, so a cut never lands mid-pixel at 1×, 2× or 8×
 * and the parts add back up to the shipped icon exactly. Fill paths made of
 * separate shapes are split into one path per shape.
 */

export const HOUSE = {
  outline:
    "M15.5 13.5v6h1.15c.642 0 1.079 0 1.416-.028.329-.027.497-.075.615-.135.282-.144.512-.374.656-.656.06-.118.108-.286.135-.615.027-.337.028-.774.028-1.416V9.863L12 3.954l-7.5 5.91v6.786c0 .642 0 1.079.028 1.416.027.329.075.497.135.615.144.282.374.512.656.656.118.06.286.108.615.135.337.027.774.028 1.416.028H8.5v-6zm5.5 3.15c0 .618 0 1.126-.033 1.539-.035.421-.109.81-.294 1.173a3 3 0 0 1-1.31 1.31c-.365.186-.753.26-1.174.295-.413.034-.921.033-1.539.033H14v-6h-4v6H7.35c-.618 0-1.126 0-1.538-.033-.422-.035-.81-.109-1.174-.294a3 3 0 0 1-1.31-1.31c-.186-.365-.26-.753-.295-1.174C3 17.776 3 17.268 3 16.65V9.136l.286-.225L12 2.045l8.714 6.866.286.225z",
  fill: "m20.714 8.911.286.225v7.514c0 .618 0 1.126-.033 1.539-.035.421-.109.81-.294 1.173a3 3 0 0 1-1.31 1.31c-.365.186-.753.26-1.174.295-.413.034-.921.033-1.539.033H14.5v-6.5h-5V21H7.35c-.618 0-1.126 0-1.538-.033-.422-.035-.81-.109-1.174-.294a3 3 0 0 1-1.31-1.31c-.186-.365-.26-.753-.295-1.174C3 17.776 3 17.268 3 16.65V9.136l.286-.225L12 2.045z",
};

export const PEOPLE = {
  outline:
    "M8.25 2.5a4.5 4.5 0 0 1 2.69 8.107 6.27 6.27 0 0 1 3.093 3.273 4.5 4.5 0 0 1 1.163-.996 3.5 3.5 0 1 1 4.606 0A4.5 4.5 0 0 1 22 16.75V21H2v-4.75a6.250 6.25 0 0 1 3.559-5.643A4.5 4.5 0 0 1 8.25 2.5m0 9a4.75 4.75 0 0 0-4.75 4.75v3.25H13v-3.25a4.75 4.75 0 0 0-4.75-4.75m9.25 2.25a3 3 0 0 0-3 3v2.75h6v-2.75a3 3 0 0 0-3-3m0-5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4M8.25 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  /* The shipped fill is one path of four separate shapes. */
  fillBigBody: "M8.25 11.75A6.25 6.25 0 0 1 14.5 18v3H2v-3a6.25 6.25 0 0 1 6.25-6.25",
  fillSmallBody: "M17.499 13.75a4.5 4.5 0 0 1 4.5 4.5V21h-6v-3c0-1.29-.317-2.504-.874-3.573a4.5 4.5 0 0 1 2.374-.677",
  fillSmallHead: "M17.5 6.5a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5",
  fillBigHead: "M8.25 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8",
};

export const PEOPLE_FILL =
  "M8.25 11.75A6.25 6.25 0 0 1 14.5 18v3H2v-3a6.25 6.25 0 0 1 6.25-6.25m9.249 2a4.5 4.5 0 0 1 4.5 4.5V21h-6v-3c0-1.29-.317-2.504-.874-3.573a4.5 4.5 0 0 1 2.374-.677M17.5 6.5a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5M8.25 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8";

export const BRIEFCASE = {
  outline:
    "M13.75 2a3 3 0 0 1 3 3v.5h5.255v11.15c0 .618 0 1.126-.033 1.539-.035.421-.109.81-.294 1.173a3 3 0 0 1-1.31 1.31c-.365.186-.752.26-1.174.295-.412.034-.921.033-1.539.033H6.35c-.618 0-1.126 0-1.538-.033-.422-.035-.81-.109-1.174-.294a3 3 0 0 1-1.31-1.31c-.186-.365-.26-.753-.295-1.174C2 17.776 2 17.268 2 16.65V5.5h5.25V5a3 3 0 0 1 3-3zm6.755 10.595q-.34.197-.729.303c-.405.108-.877.102-1.526.102H5.75c-.65 0-1.12.006-1.526-.102a3 3 0 0 1-.724-.3v4.052c0 .642 0 1.079.028 1.416.027.329.075.497.135.615.144.282.374.512.656.656.118.06.286.108.615.135.337.027.774.028 1.416.028h11.305c.642 0 1.079 0 1.416-.028.329-.027.497-.075.614-.135.283-.144.513-.374.657-.656.06-.118.108-.286.135-.615.027-.337.028-.774.028-1.416zM3.5 9.25c0 .746.006.972.05 1.139a1.5 1.5 0 0 0 1.061 1.06c.167.045.393.051 1.139.051h12.5c.746 0 .972-.006 1.139-.05a1.5 1.5 0 0 0 1.06-1.061c.045-.167.051-.393.051-1.139h.005V7H3.5zm6.75-5.75A1.5 1.5 0 0 0 8.75 5v.5h6.5V5a1.5 1.5 0 0 0-1.5-1.5z",
  /* The shipped fill is two paths: the body, and the lid with its handle. */
  fillBody:
    "M22.005 16.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.31 1.31c-.642.328-1.483.328-3.163.328H6.8c-1.68 0-2.520 0-3.162-.327a3 3 0 0 1-1.31-1.31C2 18.72 2 17.88 2 16.2v-3.602a3 3 0 0 0 .724.3c.405.108.877.102 1.526.102h15.5c.65 0 1.12.006 1.526-.102q.39-.106.729-.303z",
  fillLid:
    "M14 2a2.75 2.75 0 0 1 2.75 2.75v.75h5.255v3.75H22c0 .746-.006.972-.05 1.139a1.5 1.5 0 0 1-1.061 1.06c-.167.045-.393.051-1.139.051H4.25c-.746 0-.972-.006-1.139-.05a1.5 1.5 0 0 1-1.06-1.061C2.006 10.222 2 9.996 2 9.25V5.5h5.25v-.75A2.75 2.75 0 0 1 10 2zm-4 1.5c-.69 0-1.25.56-1.25 1.25v.75h6.5v-.75c0-.69-.56-1.25-1.25-1.25z",
};

export const MESSAGE = {
  dots: [
    "M8 8.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2",
    "M12 8.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2",
    "M16 8.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2",
  ],
  outlineDots: "M8 8.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2m4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2m4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2",
  bubble:
    "M13.864 2a8.136 8.136 0 0 1 3.568 15.447L10.25 20.95V17.5h-.5a7.75 7.75 0 0 1 0-15.5zM9.75 3.5a6.25 6.25 0 1 0 0 12.5h2v2.549l5.023-2.450A6.635 6.635 0 0 0 13.864 3.5z",
  /*
   * LinkedIn's message-fill-medium wasn't captured (opening Messaging marks
   * messages read), so it's built in the set's style: the outline's outer
   * contour filled solid, with the three dots knocked out.
   */
  fillContour: "M13.864 2a8.136 8.136 0 0 1 3.568 15.447L10.25 20.95V17.5h-.5a7.75 7.75 0 0 1 0-15.5z",
};

/** The built filled message icon as one even-odd path, for the static and reduced-motion views. */
export const MESSAGE_FILL = `${MESSAGE.fillContour}${MESSAGE.outlineDots}`;

export const BELL = {
  outline:
    "M12 2.5a6.75 6.75 0 0 1 6.75 6.75v2.365a4.4 4.4 0 0 0 1.29 3.114l.96.96V18h-5.259a3.75 3.75 0 0 1-7.482 0H3v-2.31l.96-.961a4.4 4.4 0 0 0 1.29-3.114V9.25A6.75 6.75 0 0 1 12 2.5M9.765 18a2.25 2.25 0 0 0 4.47 0zM12 4a5.25 5.25 0 0 0-5.250 5.25v2.365a5.9 5.9 0 0 1-1.729 4.174l-.521.522v.189h15v-.19l-.521-.52a5.9 5.9 0 0 1-1.729-4.175V9.25C17.25 6.350 14.9 4 12 4",
  /**
   * The outline's clapper on its own: the ring below the rim, cut from the
   * same arcs. Drawn as a path rather than as the outline clipped below the
   * rim, because the rim's bottom edge sits exactly on that cut, and once the
   * clapper swings at an angle the edge and the clip each antialias the same
   * pixels and leave a faint copy of the rim trailing behind.
   */
  outlineClapper: "M15.741 18a3.75 3.75 0 0 1-7.482 0zM9.765 18a2.25 2.25 0 0 0 4.47 0z",
  fillClapper: "M15.675 18.5a3.751 3.751 0 0 1-7.35 0z",
  fillBody:
    "M12 2.5A6.5 6.5 0 0 1 18.5 9v2.418a3.98 3.98 0 0 0 1.357 2.992l.887.775.256.225V17H3v-1.59l.256-.225.887-.775A3.98 3.98 0 0 0 5.5 11.418V9A6.5 6.5 0 0 1 12 2.5",
};

/** caret-down-fill-small, 16 × 16. */
export const CARET = "M8 11 3.5 6.5h9z";

/*
 * The phone bar's Post icon isn't in the captured set, so it's drawn in the
 * set's style: an 18 × 18 rounded square with a 1.5 contour and the
 * briefcase's 3-unit outer corners, and a plus inside.
 */
export const POST = {
  square:
    "M18 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM6 4.5A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 18 4.5z",
  plus: "M12.75 8v3.25H16v1.5h-3.25V16h-1.5v-3.25H8v-1.5h3.25V8z",
};
