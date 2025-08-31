export const WA_MSG = {
  absent: (
    name: string,
    date: string,
    batch: string
  ) => `*Attendance Alert - Education+*  

Dear Parent,  
We wish to inform you that your ward, *${name}*, was marked *absent* on _${date}_ in batch *${batch}*.  

Kindly ensure regular attendance for better learning and continuity in studies.  

Regards,  
Team Education+`,

  extraClass: (props: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => `*📚 Extra Class Alert - Education+*  

Dear Parent,  
We wish to inform you that your ward, *${props.name}*, will be staying late on _${props.date}_ due to an extra class scheduled from ${props.startTime} to ${props.endTime}.  

Kindly make necessary arrangements for pickup accordingly.  

Regards,  
Team Education+`,

  result: (props: {
    name: string;
    date: string;
    subject: string;
    marks_obtained: string | number;
    total_marks: string | number;
  }) => `*Result Alert - Education+*  

Dear Parent,  
We wish to inform you that your ward, *${props.name}*, has secured *${props.marks_obtained}* out of *${props.total_marks}* marks in *${props.subject}* examination held on _${props.date}_.  

We encourage you to review the performance with your ward and support them for further improvement.  

Regards,  
Team Education+`,

  resultAbsent: (props: {
    name: string;
    date: string;
    subject: string;
  }) => `*Examination Attendance Alert - Education+*  

Dear Parent,  
We wish to inform you that your ward, *${props.name}*, was marked *ABSENT* in the *${props.subject}* examination held on _${props.date}_.  

Kindly ensure necessary guidance and support to avoid such occurrences in the future.  

Regards,  
Team Education+`,

  feesReminder: (name: string) => `*Fees Reminder Alert - Education+*  

Dear Parent,  
This is a kind reminder that your ward *${name}* fee for this month is due. We request you to kindly clear the dues at the earliest to avoid any inconvenience.  

Thank you for your cooperation.  
(Please ignore if already paid.)  

Regards,  
Team Education+`,

  ptm: (props: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => `*Meeting Alert - Education+*  

Dear Parent,  
We request your presence on _${props.date}_ from *${props.startTime}* to *${props.endTime}* to discuss your ward *${props.name}’s* progress and career guidance.  

Regards,  
Team Education+`,
};
