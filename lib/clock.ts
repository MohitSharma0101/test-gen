class Clock {
  static getDate(date?: string) {
    const dateObj = date ? new Date(date) : new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata", // ensures IST always
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateObj);
  }

  /**
   * @returns date in format specified
   */
  static getDateInFormat(date?: string, options?: Intl.DateTimeFormatOptions) {
    const dateObj = date ? new Date(date) : new Date();
    const formatter = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options,
    });
    return formatter.format(dateObj);
  }
  /**
   * @returns date time in format specified
   */
  static getDateTimeInFormat(
    date?: string,
    options?: Intl.DateTimeFormatOptions
  ) {
    const dateObj = date ? new Date(date) : new Date();
    const formatter = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // 12-hour format with AM/PM
    });
    return formatter.format(dateObj);
  }
}

export default Clock;
