import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/_app.tsx", [
    index("routes/_index.tsx"),
    route("alignments/:alignmentId", "routes/alignments.$alignmentId.tsx"),
    route("sections/:sectionId", "routes/sections.$sectionId.tsx"),
    route("notes", "routes/notes._index.tsx"),
    route("notes/new", "routes/notes.new.tsx"),
    route("notes/:noteId", "routes/notes.$noteId.tsx"),
    route("people", "routes/people.tsx"),
  ]),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("api/transcribe", "routes/api.transcribe.tsx"),
  route("api/set-locale", "routes/api.set-locale.tsx"),
] satisfies RouteConfig;
