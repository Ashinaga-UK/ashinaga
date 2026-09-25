UPDATE "platforms"
SET
	"signposting_url" = CASE "slug"
		WHEN 'coursera' THEN 'https://www.coursera.org/'
		WHEN 'duolingo' THEN 'https://www.duolingo.com/'
		WHEN 'ashinaga_connect' THEN 'https://www.ashinagaconnect.org/'
		ELSE "signposting_url"
	END,
	"updated_at" = now()
WHERE "slug" IN ('coursera', 'duolingo', 'ashinaga_connect');
