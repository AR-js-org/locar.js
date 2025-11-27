/** Class representing a Spherical Mercator projection. */
class SphMercProjection {
  EARTH: number;
  HALF_EARTH: number;
  /**
   * Create a SphMercProjection.
   */
  constructor() {
    this.EARTH = 40075016.68;
    this.HALF_EARTH = 20037508.34;
  }

  /**
   * Project a longitude and latitude into Spherical Mercator.
   * @param {number} lon - the longitude.
   * @param {number} lat - the latitude.
   * @return {Array} Two-member array containing easting and northing.
   */
  project = (lon: number, lat: number): [number, number] => {
    return [this.#lonToSphMerc(lon), this.#latToSphMerc(lat)];
  };

  /**
   * Unproject a Spherical Mercator easting and northing.
   * @param {Array} projected - Two-member array containing easting and northing
   * @return {Array} Two-member array containing longitude and latitude
   */
  unproject = (projected: [number, number]) => {
    return [this.#sphMercToLon(projected[0]), this.#sphMercToLat(projected[1])];
  };

  #lonToSphMerc = (lon: number) => {
    return (lon / 180) * this.HALF_EARTH;
  };

  #latToSphMerc = (lat: number) => {
    var y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
    return (y * this.HALF_EARTH) / 180.0;
  };

  #sphMercToLon = (x: number) => {
    return (x / this.HALF_EARTH) * 180.0;
  };

  #sphMercToLat = (y: number) => {
    var lat = (y / this.HALF_EARTH) * 180.0;
    lat =
      (180 / Math.PI) *
      (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
    return lat;
  };

  /**
   * Return the projection's ID.
   * @return {string} The value "epsg:3857".
   */
  getID = () => {
    return "epsg:3857";
  };
}

export default SphMercProjection;
