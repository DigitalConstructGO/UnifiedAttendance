import {
  BookOpen,
  CalendarCheck2,
  Fingerprint,
  Info,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Defs, Fields, Note, P, Section, Steps, Strong, Term } from "./prose";

export const CHAPTERS = [
  { id: "start", label: "Start here", icon: BookOpen },
  { id: "day", label: "How a day is counted", icon: CalendarCheck2 },
  { id: "people", label: "A person's details", icon: UsersRound },
  { id: "readers", label: "Readers and badges", icon: Fingerprint },
  { id: "corrections", label: "Fixing a day", icon: ScrollText },
  { id: "roles", label: "Who can do what", icon: ShieldCheck },
] as const;

export function StartHere() {
  return (
    <Section id="start" title="Start here" lead="What this system is for, in one page.">
      <P>
        This system answers one question for every member of staff, every day:{" "}
        <Strong>were they here, and when</Strong>. Everything else — the branches, the departments,
        the readers on the wall — exists to make that answer trustworthy.
      </P>
      <P>
        The answer is never typed in by hand. It is worked out from what the biometric readers
        actually recorded. That matters: it means nobody can quietly improve their own attendance,
        and it means when a figure looks wrong there is always a record underneath explaining why.
      </P>
      <P>
        You will meet three words everywhere. A <Term>punch</Term> is one touch of a reader. An{" "}
        <Term>event</Term> is that punch once the system has stored it. A <Term>day</Term> is the
        conclusion drawn from all of a person&rsquo;s events for one date — present or absent, on
        time or late, how long they worked.
      </P>
      <Note icon={Info} title="Nothing is ever overwritten">
        Corrections, manual entries and released badges are all added <em>beside</em> the original
        record, never on top of it. You can always see what the reader said and what a human changed
        afterwards.
      </Note>
    </Section>
  );
}

export function HowADayIsCounted() {
  return (
    <Section
      id="day"
      title="How a day is counted"
      lead="From a finger on the sensor to a row on the register."
    >
      <Steps
        items={[
          {
            title: "Someone touches the reader",
            body: "The reader knows them only as a badge number. It does not know their name, their branch, or whether they are late — it just records that badge 1001 was seen at 08:05:37.",
          },
          {
            title: "The reader sends it to us",
            body: "Within a few seconds, not at the end of the day. The reader starts the conversation; we never dial out to it.",
          },
          {
            title: "The badge is matched to a person",
            body: "We look up who was holding that badge on that date. If nobody was, the punch is still kept — it appears as an unmatched punch so somebody can investigate rather than it vanishing.",
          },
          {
            title: "The day is worked out again",
            body: "First arrival, last departure, minutes late, minutes early, hours worked. This is redone from scratch every time anything about that day changes, so it can never drift out of step with the records underneath it.",
          },
        ]}
      />
      <P>
        Lateness is measured against the branch&rsquo;s <Term>working days</Term> — the opening and
        closing time set for each weekday. A branch with no opening time recorded has nothing to be
        late against, so everybody there shows as on time.
      </P>
      <Note icon={Info} title="Times belong to the branch, not to you">
        Every reader reports its own local clock. A branch in a different timezone keeps its own
        hours, so 08:00 always means 08:00 <em>there</em> — not 08:00 wherever you happen to be
        reading the screen.
      </Note>
    </Section>
  );
}

export function PersonDetails() {
  return (
    <Section
      id="people"
      title="A person's details"
      lead="Everything the system holds about somebody, and why it holds it."
    >
      <P>
        A member of staff is stored in two halves. The <Strong>person</Strong> is who they are, and
        would stay true if they left and came back. The <Strong>employment</Strong> is how they work
        here, and changes when they move branch, get promoted, or leave.
      </P>

      <Fields
        caption="Who they are"
        fields={[
          { label: "First name", required: true, meaning: "Used everywhere they are named." },
          { label: "Middle name", meaning: "Recorded if they use one." },
          { label: "Last name", required: true, meaning: "Used everywhere they are named." },
          { label: "Gender", meaning: "Recorded for reporting only.", options: ["Male", "Female"] },
          { label: "Phone", meaning: "How the office reaches them." },
          { label: "Email", meaning: "How the office reaches them in writing." },
          {
            label: "Photo",
            meaning: "Shown beside their name so a face can be matched to a record.",
          },
          {
            label: "National ID",
            meaning: "Front and back images, held as proof of identity for the personnel file.",
          },
          {
            label: "Emergency contact",
            meaning: "A name and a phone number, for the day something goes wrong at work.",
          },
        ]}
      />

      <Fields
        caption="How they work here"
        fields={[
          {
            label: "Employee code",
            required: true,
            meaning: "Your own reference for this person. No two people can share one.",
          },
          {
            label: "Branch",
            required: true,
            meaning:
              "Which site they work at. This decides whose register they appear on and which opening hours they are judged against.",
          },
          {
            label: "Department",
            meaning: "The team they belong to. Used for filtering and reports.",
          },
          { label: "Position", meaning: "Their job title." },
          {
            label: "Employment type",
            required: true,
            meaning: "How they are engaged.",
            options: ["Permanent", "Contract", "Part time", "Intern"],
          },
          { label: "Hire date", required: true, meaning: "The day they started." },
          {
            label: "Status",
            required: true,
            meaning:
              "Suspended and terminated staff keep all their history but drop off the daily register.",
            options: ["Active", "Suspended", "Terminated"],
          },
        ]}
      />

      <P>
        Changing someone&rsquo;s branch, department, position or status does not erase what came
        before. Each change closes the old arrangement and opens a new one, so a register from six
        months ago still shows the branch they were actually working at then.
      </P>
    </Section>
  );
}

export function ReadersAndBadges() {
  return (
    <Section
      id="readers"
      title="Readers and badges"
      lead="Two halves that both have to be in place before attendance can work."
    >
      <P>
        A reader sends a badge number. It does not send a name. So attendance needs two things
        registered before it can record anything useful: the <Strong>reader</Strong>, so we know
        which branch a punch came from, and the <Strong>enrolment</Strong>, so we know whose badge
        it was.
      </P>

      <Fields
        caption="A reader"
        fields={[
          {
            label: "Reader name",
            required: true,
            meaning: "What staff call it — “Main gate”, “Back door”.",
          },
          {
            label: "Serial number",
            required: true,
            meaning:
              "Printed on the device. This is the only thing the reader tells us about itself, so it must match exactly.",
          },
          {
            label: "Branch",
            required: true,
            meaning: "Where it is installed. Punches inherit this branch.",
          },
          { label: "Model and firmware", meaning: "Recorded so you know what is on the wall." },
          {
            label: "IP address",
            meaning:
              "For your reference only. The reader always calls us — nothing here dials out to it.",
          },
          {
            label: "Status",
            required: true,
            meaning:
              "Retiring a reader stops it counting without deleting the punches it has already sent.",
            options: ["Active", "Retired"],
          },
        ]}
      />

      <P>
        A reader shows as <Term>Online</Term> when it has reported recently, <Term>Quiet</Term> when
        it has said nothing for a quarter of an hour, and <Term>Offline</Term> when it has been
        silent for an hour or has been retired on purpose.
      </P>

      <Note icon={Info} title="Quiet is the one to watch">
        A reader that has stopped reporting does not look broken. The register still loads and still
        looks reasonable — it is simply missing everybody who has walked past that door since. Quiet
        and offline readers are listed on the dashboard for exactly this reason.
      </Note>

      <P>
        A badge belongs to one person at a time. When somebody hands their badge back you{" "}
        <Strong>release</Strong> it rather than deleting it: the punches they already made under
        that number stay attached to them, and the number becomes free for the next person.
      </P>
    </Section>
  );
}

export function FixingADay() {
  return (
    <Section
      id="corrections"
      title="Fixing a day"
      lead="When the reader missed something, or got it wrong."
    >
      <P>
        Readers miss punches. Somebody arrives while the device is rebooting, or leaves through a
        door that has no reader. A <Strong>correction</Strong> is how you put that right, and it
        takes effect the moment you make it — there is nobody to wait for.
      </P>
      <P>Seven kinds, and the choice matters because each one does something different:</P>
      <Defs
        caption="Kinds of correction"
        items={[
          {
            label: "Add check-in",
            meaning:
              "They worked, but no arrival was recorded. You give the time it should have been.",
          },
          {
            label: "Add check-out",
            meaning: "They left, but no departure was recorded. You give the time.",
          },
          { label: "Adjust check-in", meaning: "An arrival exists but the time on it is wrong." },
          { label: "Adjust check-out", meaning: "A departure exists but the time on it is wrong." },
          {
            label: "Mark present",
            meaning: "Count the day as worked without claiming particular times.",
          },
          { label: "Mark absent", meaning: "Discard the day's punches and record an absence." },
          {
            label: "Excuse lateness",
            meaning: "Keep the times exactly as they are, but stop counting the minutes late.",
          },
        ]}
      />
      <P>
        The first four ask you for a time, down to the second, because that is the resolution the
        readers record in. The last three do not — they state an outcome, not a moment.
      </P>
      <P>
        Every correction records who made it, when, and the reason they gave. The reason is not
        optional and it is not decoration — it is the answer when somebody asks six months later why
        a day looks the way it does.
      </P>
      <P>
        Made one by mistake? <Strong>Undo</Strong> removes it and the day goes straight back to what
        the records say. There is nothing to cancel or reverse, because the correction was never a
        request in the first place.
      </P>
    </Section>
  );
}

export function WhoCanDoWhat() {
  return (
    <Section
      id="roles"
      title="Who can do what"
      lead="Four roles. What you see depends on which one you hold."
    >
      <Defs
        caption="Roles"
        items={[
          {
            label: "Super Administrator",
            meaning:
              "Everything, including setting up the organisation and granting other people access.",
          },
          {
            label: "Administrator",
            meaning: "Everything day to day: staff, attendance, corrections, readers, clients.",
          },
          {
            label: "HR",
            meaning:
              "Staff records and attendance, including making corrections. Cannot register readers or manage clients.",
          },
          { label: "Manager", meaning: "Read-only on staff, plus the client book." },
        ]}
      />
      <P>
        The menu only shows what your role can reach, so an empty sidebar section is not a fault —
        it is the system declining to offer you something you would be refused anyway. If you think
        you are missing something you should have, that is a conversation with an administrator.
      </P>
    </Section>
  );
}

export const CHAPTER_COMPONENTS = [
  StartHere,
  HowADayIsCounted,
  PersonDetails,
  ReadersAndBadges,
  FixingADay,
  WhoCanDoWhat,
];
