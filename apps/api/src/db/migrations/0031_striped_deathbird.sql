CREATE TABLE "annual_review_copy" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"strings" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "annual_review_copy" ADD CONSTRAINT "annual_review_copy_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "annual_review_copy" ("id", "version", "strings")
VALUES (
	1,
	1,
	$copy${
	  "helpers.numberHint": "(Enter a number)",
	  "sections.yearOverview.title": "Year Overview",
	  "sections.yearOverview.description": "This review is for the academic year shown below. Share important moments you would like Ashinaga to know about.",
	  "sections.workAndActivities.title": "Work And Activities",
	  "sections.workAndActivities.description": "Share employment, extracurriculars, personal projects, clubs, and other activities from the year.",
	  "sections.leadershipAndImpact.title": "Leadership and Impact",
	  "sections.leadershipAndImpact.description": "Summarise your leadership roles and the ways you have passed kindness forward this year.",
	  "sections.africaEngagementAndInternships.title": "Africa Engagement And Internships",
	  "sections.africaEngagementAndInternships.description": "Capture sub-Saharan Africa-related activities and internship experience.",
	  "sections.academicResults.title": "Academic Results",
	  "sections.academicResults.description": "Record your classification and weighted grade for the academic year.",
	  "questions.academicYear.prompt": "Academic year",
	  "questions.highlights.prompt": "Please describe any highlights; such as distinctions, awards, accomplishments, projects, or anything you are particularly proud of.",
	  "questions.partTimeJobs.prompt": "Over the last year, have you had any part-time job(s)? Please briefly describe them.",
	  "questions.extracurriculars.prompt": "Extracurriculars: What activities did you get involved in, such as hobbies, personal projects, clubs, etc.?",
	  "questions.leadershipRolesCount.prompt": "How many leadership roles have you held this year?",
	  "questions.leadershipRolesDescription.prompt": "Leadership roles description: Describe the roles, organisations, events, etc.",
	  "questions.payItForwardCount.prompt": "How many pay-it-forward activities have you taken part in this year? (Defined as passing on the kindness you have received, above and beyond everyday kindness, with no expectation of return.)",
	  "questions.payItForwardDescription.prompt": "How have you paid it forward this year? Describe the activities.",
	  "questions.subSaharanAfricaActivitiesCount.prompt": "How many sub-Saharan Africa-related activities this year?",
	  "questions.subSaharanAfricaActivitiesDescription.prompt": "What activities connected to sub-Saharan Africa have you been involved in? Describe the role, organisation, event, etc.",
	  "questions.independentInternshipsCount.prompt": "How many independently secured internships did you complete this year? Total number anywhere in the world.",
	  "questions.internshipsInAfricaSummary.prompt": "Internships in Africa summary: Describe the positions, roles, etc.",
	  "questions.internshipsElsewhereSummary.prompt": "Internships in UK, or elsewhere except Africa summary: Describe the positions, roles, etc.",
	  "questions.completedAshinagaAfricaInternship.prompt": "Did you complete your Ashinaga 8-week internship in sub-Saharan Africa this year?",
	  "questions.academicYearAverageClassification.prompt": "What was your academic year average? Please input according to classification, e.g. 1st, 2:1, 2:2, 3rd.",
	  "questions.academicYearWeightedGrade.prompt": "What is your year average weighted grade for the academic year? For example, 70% / 64%."
	}$copy$::jsonb
)
ON CONFLICT ("id") DO NOTHING;