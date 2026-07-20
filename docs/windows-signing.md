# Windows installer signing

GBA Studio signs the packaged application and Squirrel installer when the
following GitHub Actions repository secrets are configured:

- `WINDOWS_CERTIFICATE_BASE64`: base64-encoded PFX code-signing certificate
- `WINDOWS_CERTIFICATE_PASSWORD`: password for that PFX file

Create the base64 value on Windows without adding the certificate to the
repository:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("C:\path\to\code-signing-certificate.pfx")
) | Set-Clipboard
```

The release workflow refuses to publish a tagged Windows build without both
secrets. Branch and pull-request builds can remain unsigned. Signed builds are
validated with `Get-AuthenticodeSignature` before their artifacts are uploaded.

Use a publicly trusted Authenticode code-signing certificate. Self-signed
certificates are suitable only for local testing and do not establish public
SmartScreen trust. Keep the same publisher identity across releases so its
reputation can accumulate.
