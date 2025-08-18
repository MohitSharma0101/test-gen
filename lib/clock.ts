class Clock {
  static getDate(date?: string) {
    const dateObj = date ? new Date(date) : new Date();
    return dateObj.toISOString().split("T")[0];
  }

  /**
   * @returns date in format specified
   */
  static getDateInFormat(date?: string, options?: Intl.DateTimeFormatOptions) {
    const dateObj = date ? new Date(date) : new Date();
    const formatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options,
    });
    return formatter.format(dateObj);
  }
}

export default Clock;
