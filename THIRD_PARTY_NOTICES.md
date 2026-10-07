# Third-party notices

The repository's custom license applies only to original covered material
that Hayden Lindley has authority to license. It does not relicense third-party
code, documentation, fonts, images, dependencies, or other assets.

Third-party material keeps its applicable license, copyright notices, and
attribution requirements. A dependency's inclusion does not make it subject
to the Dotsys operational restriction. Consult the component's own
license for its permissions and obligations.

## Source and asset inventory

Inventory checked on 2026-10-03 for the initial Dotsys package: the HTML,
CSS, JavaScript, SVG illustrations, protocol documentation, JSON schemas and
examples, Python reference validator, and tests. These are original project
files; no vendored upstream implementation, font file,
JavaScript library, or third-party package distribution is included.

The static site uses browser APIs and system font fallbacks (Arial,
Helvetica, and sans-serif). Referencing an installed system font does not
bundle that font. The SVG illustrations and inline favicon are project
assets. References to AGENTS.md, MCP, A2A, llms.txt, and JSON Schema describe
external conventions or standards; they do not include their implementations
or claim compatibility certification.

## User-supplied brand artwork

`assets/dotsys-brand.png` is the branding image supplied by the project owner on 2026-10-03. It is included unchanged, with its visible corgi illustration, lettering, and palette intact. It is distinct from the project-authored explanatory SVG diagrams. Its authorship and underlying rights were not independently verified; inclusion does not assert that the SVG authors created it or that a new license for the image has been granted. The protocol name in project text remains **Dotsys**.

## External Python dependencies

The reference validator (`reference/validate.py`) imports the following
separately installed packages. Their code and package distributions are not
bundled in this repository. The versions below were present in the local
verification environment; see `VERIFY.md` for usage and requirements.

### jsonschema 4.26.0

- Purpose: Draft 2020-12 JSON Schema validation and format checking.
- License: MIT.
- Upstream copyright notice: Copyright (c) 2013 Julian Berman.
- [Upstream project](https://github.com/python-jsonschema/jsonschema).
- [Complete upstream license](https://github.com/python-jsonschema/jsonschema/blob/main/COPYING).
- Installed package metadata declares MIT; its distributed `COPYING` notice
  matches the attribution above.
- No upstream source is copied or modified in this repository.

### referencing 0.37.0

- Purpose: reference registry used by the offline schema validator; also a
  dependency of jsonschema.
- License: MIT.
- Upstream copyright notice: Copyright (c) 2022 Julian Berman.
- [Upstream project](https://github.com/python-jsonschema/referencing).
- [Complete upstream license](https://github.com/python-jsonschema/referencing/blob/main/COPYING).
- Installed package metadata declares MIT; its distributed `COPYING` notice
  matches the attribution above.
- No upstream source is copied or modified in this repository.

Python, its standard library, and any dependencies installed by these packages
remain separately provided under their respective terms. This repository is
not a redistribution of that runtime environment. If a future release bundles
an interpreter, package distributions, transitive dependencies, or other
third-party assets, update this inventory and include their required license
texts and notices with that distribution. In particular, MIT-licensed code
redistribution requires retaining the applicable copyright and permission
notice; these links are not a substitute when bundling the code itself.

Links to documentation and descriptive references to services do not assert
ownership of those services or their trademarks. OpenAI, ChatGPT, Codex,
Vercel, and other third-party names are used descriptively and imply no
endorsement or partnership.

## Independently licensed original interoperability packages

`interop/zeke-authorize/` contains original Zeke Authorize code and documentation under its own Apache-2.0 LICENSE and NOTICE, with a separate branding/endorsement policy. This exemption is covered by the root license's separately licensed material boundary. It does not relicense DotSys discovery or import restricted DotSys code. Its Node dependencies are separately installed from the pinned package lock and retain their own license obligations; no dependency distributions are bundled.
