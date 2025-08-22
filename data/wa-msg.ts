export const WA_MSG = {
  absent: (name: string, date: string, batch: string) => `Dear Parent,
We wish to inform you that your ward, *${name}*, was marked *absent* on _${date}_ in batch *${batch}*.  

Kindly ensure regular attendance for better learning and continuity in studies.

Regards,
Team Education+`,
  extraClass: (name: string, date: string) => `Dear Parent,  
We wish to inform you that your ward, *${name}*, will be staying late on _${date}_ due to an extra class.  

Kindly make necessary arrangements for pickup accordingly.  

Regards,  
Team Education+`,
  result: (props: {
    name: string;
    date: string;
    subject: string;
    marks_obtained: string;
    total_marks: string;
  }) => `Dear Parent,  
We wish to inform you that your ward, *${props.name}*, has secured *${props.marks_obtained}* out of *${props.total_marks}* marks in *${props.subject}* examination held on _${props.date}_.  

We encourage you to review the performance with your ward and support them for further improvement.  

Regards,  
Team Education+ `,
};
